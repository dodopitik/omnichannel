import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Attachment } from 'nodemailer/lib/mailer';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Attachment[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('mail.host'),
      port: this.configService.get('mail.port'),
      secure: this.configService.get('mail.secure'),
      auth:
        this.configService.get('mail.user')
          ? {
              user: this.configService.get('mail.user'),
              pass: this.configService.get('mail.password'),
            }
          : undefined,
    });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('mail.from'),
        ...options,
      });
      this.logger.log(`Email sent to: ${options.to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }

  async sendPasswordReset(email: string, token: string, name: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    await this.sendMail({
      to: email,
      subject: 'Reset Password - Omnichannel Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Password</h2>
          <p>Halo <strong>${name}</strong>,</p>
          <p>Kami menerima permintaan reset password untuk akun Anda.</p>
          <p>Klik tombol di bawah untuk mereset password Anda:</p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #0070f3; 
                    color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Reset Password
          </a>
          <p>Link ini akan kedaluwarsa dalam 1 jam.</p>
          <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 14px;">Omnichannel Marketplace Management System</p>
        </div>
      `,
    });
  }

  async sendEmailVerification(email: string, token: string, name: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const verifyUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    await this.sendMail({
      to: email,
      subject: 'Verifikasi Email - Omnichannel Marketplace',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verifikasi Email</h2>
          <p>Halo <strong>${name}</strong>,</p>
          <p>Terima kasih telah mendaftar. Silakan verifikasi email Anda:</p>
          <a href="${verifyUrl}"
             style="display: inline-block; padding: 12px 24px; background-color: #10b981; 
                    color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Verifikasi Email
          </a>
          <p>Link ini akan kedaluwarsa dalam 24 jam.</p>
          <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
          <p style="color: #666; font-size: 14px;">Omnichannel Marketplace Management System</p>
        </div>
      `,
    });
  }
}
