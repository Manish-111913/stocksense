import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('MAIL_FROM', 'StockSense <no-reply@stocksense.local>');
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: Number(config.get('SMTP_PORT', 587)),
          secure: config.get('SMTP_SECURE') === 'true',
          auth: config.get('SMTP_USER')
            ? { user: config.get<string>('SMTP_USER'), pass: config.get<string>('SMTP_PASSWORD') }
            : undefined,
        })
      : null;
  }

  async sendPasswordResetOtp(to: string, fullName: string, otp: string, expiryMinutes: number) {
    if (!this.transporter) {
      // Development only (env validation requires SMTP in production)
      this.logger.warn(`[DEV — no SMTP configured] Password reset OTP for ${to}: ${otp}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Your StockSense password reset code',
      text: `Hi ${fullName},\n\nYour StockSense password reset code is ${otp}. It expires in ${expiryMinutes} minutes.\n\nIf you didn't request this, you can ignore this email.`,
      html: `<p>Hi ${escapeHtml(fullName)},</p><p>Your StockSense password reset code is <strong style="font-size:18px;letter-spacing:2px">${otp}</strong>.</p><p>It expires in ${expiryMinutes} minutes. If you didn't request this, you can ignore this email.</p>`,
    });
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
