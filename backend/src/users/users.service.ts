import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { hash, verify } from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ChangePasswordDto, UpdateProfileDto } from './dto/users.dto.js';
import { toUserProfile, type UserProfile } from './user-profile.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return toUserProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone === undefined ? undefined : dto.phone || null,
      },
    });
    return toUserProfile(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!(await verify(user.passwordHash, dto.currentPassword))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(dto.newPassword) },
    });
    return { message: 'Password changed' };
  }
}
