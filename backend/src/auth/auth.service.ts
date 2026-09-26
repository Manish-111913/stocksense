import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { hash, verify } from 'argon2';
import { randomBytes, randomInt } from 'node:crypto';
import { Prisma, type User } from '../generated/prisma/client.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { toUserProfile, type UserProfile } from '../users/user-profile.js';
import type { AccessTokenPayload, RefreshTokenPayload, ResetTokenPayload } from './auth-user.js';
import type { ForgotPasswordDto, LoginDto, ResetPasswordDto, SignupDto, VerifyOtpDto } from './dto/auth.dto.js';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
}

type ExpiresIn = JwtSignOptions['expiresIn'];

const INVALID_CREDENTIALS = 'Invalid email or password';
const INVALID_OTP = 'Invalid or expired OTP';
const FORGOT_PASSWORD_MESSAGE = 'If an account exists for this email, a 6-digit OTP has been sent.';

@Injectable()
export class AuthService implements OnModuleInit {
  /** Verified against when the email is unknown, so response time doesn't reveal which emails exist */
  private dummyHash = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async onModuleInit() {
    this.dummyHash = await hash(randomBytes(32).toString('hex'));
  }

  // ---------------------------------------------------------------------------
  // Signup / login / refresh
  // ---------------------------------------------------------------------------

  async signup(dto: SignupDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    try {
      // Role is never taken from the client. The very first account bootstraps the system as the
      // INVENTORY_MANAGER (nothing is seeded); every later signup gets the default WAREHOUSE_STAFF.
      const isFirstUser = (await this.prisma.user.count()) === 0;
      const user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          passwordHash: await hash(dto.password),
          role: isFirstUser ? 'INVENTORY_MANAGER' : undefined,
          lastLoginAt: new Date(),
        },
      });
      return this.issueTokens(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const passwordOk = await verify(user?.passwordHash ?? this.dummyHash, dto.password);
    if (!user || !passwordOk) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is inactive. Contact an inventory manager.');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueTokens(updated);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }
    return this.issueTokens(user);
  }

  // ---------------------------------------------------------------------------
  // Forgot password → verify OTP → reset password
  // ---------------------------------------------------------------------------

  /** OTP timings from config, returned with every forgot-password response so the UI timers match the server */
  private otpPolicy() {
    return {
      expiresInSeconds: Number(this.config.get('OTP_EXPIRY_MINUTES', 5)) * 60,
      resendCooldownSeconds: Number(this.config.get('OTP_RESEND_COOLDOWN_SECONDS', 30)),
    };
  }

  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string; expiresInSeconds: number; resendCooldownSeconds: number }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const response = { message: FORGOT_PASSWORD_MESSAGE, ...this.otpPolicy() };

    // Same response whether or not the account exists (no account enumeration)
    if (!user || user.status !== 'ACTIVE') {
      return response;
    }

    const cooldownSeconds = Number(this.config.get('OTP_RESEND_COOLDOWN_SECONDS', 30));
    const latest = await this.prisma.passwordResetOtp.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < cooldownSeconds * 1000) {
      return response;
    }

    const otp = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const expiryMinutes = Number(this.config.get('OTP_EXPIRY_MINUTES', 5));
    const now = new Date();

    await this.prisma.$transaction([
      // Only the newest code is valid: retire any earlier unused ones
      this.prisma.passwordResetOtp.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.passwordResetOtp.create({
        data: {
          userId: user.id,
          otpHash: await hash(otp),
          expiresAt: new Date(now.getTime() + expiryMinutes * 60_000),
        },
      }),
    ]);

    await this.mail.sendPasswordResetOtp(user.email, user.fullName, otp, expiryMinutes);
    return response;
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<{ resetToken: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true, status: true } });
    if (!user || user.status !== 'ACTIVE') {
      throw new BadRequestException(INVALID_OTP);
    }

    const record = await this.prisma.passwordResetOtp.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    const maxAttempts = Number(this.config.get('OTP_MAX_ATTEMPTS', 5));
    if (!record || record.expiresAt <= new Date() || record.attemptCount >= maxAttempts) {
      throw new BadRequestException(INVALID_OTP);
    }

    if (!(await verify(record.otpHash, dto.otp))) {
      // Guarded increment so concurrent wrong guesses can't exceed the limit
      await this.prisma.passwordResetOtp.updateMany({
        where: { id: record.id, attemptCount: { lt: maxAttempts } },
        data: { attemptCount: { increment: 1 } },
      });
      throw new BadRequestException(INVALID_OTP);
    }

    await this.prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { verifiedAt: new Date() },
    });

    const payload: ResetTokenPayload = { sub: user.id, otpId: record.id, type: 'password-reset' };
    const resetToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_RESET_SECRET'),
      expiresIn: this.config.get('JWT_RESET_EXPIRES_IN', '10m') as ExpiresIn,
    });
    return { resetToken };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    let payload: ResetTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<ResetTokenPayload>(dto.resetToken, {
        secret: this.config.getOrThrow<string>('JWT_RESET_SECRET'),
      });
    } catch {
      throw new BadRequestException('Your password reset session has expired. Please request a new OTP.');
    }
    if (payload.type !== 'password-reset') {
      throw new BadRequestException('Invalid reset token');
    }

    const passwordHash = await hash(dto.newPassword);

    await this.prisma.$transaction(async (tx) => {
      // Consume the verified OTP exactly once; a second use of the same token updates nothing
      const consumed = await tx.passwordResetOtp.updateMany({
        where: { id: payload.otpId, userId: payload.sub, verifiedAt: { not: null }, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) {
        throw new BadRequestException('Your password reset session has expired. Please request a new OTP.');
      }
      await tx.user.update({ where: { id: payload.sub }, data: { passwordHash } });
    });

    return { message: 'Your password has been updated. You can now sign in with your new password.' };
  }

  // ---------------------------------------------------------------------------

  private async issueTokens(user: User): Promise<AuthResponse> {
    const accessPayload: AccessTokenPayload = { sub: user.id, email: user.email, role: user.role };
    const refreshPayload: RefreshTokenPayload = { sub: user.id, type: 'refresh' };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(accessPayload, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN', '15m') as ExpiresIn,
      }),
      this.jwt.signAsync(refreshPayload, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d') as ExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken, user: toUserProfile(user) };
  }
}
