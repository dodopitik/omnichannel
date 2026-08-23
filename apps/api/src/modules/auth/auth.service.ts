import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../../infrastructure/database/database.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { MailService } from '../../infrastructure/mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../../common/decorators/current-user.decorator';
import { User } from '@omnichannel/database';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthResponse {
  user: Partial<User & { roles: string[]; permissions: string[] }>;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MINUTES = 30;

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Login ─────────────────────────────────────────────────
  async login(dto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const user = await this.db.user.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new UnauthorizedException(
        `Account locked. Try again in ${minutesLeft} minutes.`,
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account status
    if (user.status !== 'ACTIVE') {
      if (user.status === 'PENDING_VERIFICATION') {
        throw new UnauthorizedException('Please verify your email first');
      }
      throw new UnauthorizedException('Account is not active');
    }

    // Reset failed login count
    await this.db.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Collect roles and permissions
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.name)),
      ),
    ];

    // Generate tokens
    const tokens = await this.generateTokens(
      user.id,
      user.email,
      user.username,
      roles,
      permissions,
      dto.rememberMe,
    );

    // Store refresh token in DB
    const tokenFamily = uuidv4();
    const refreshExpires = this.configService.get<string>(
      dto.rememberMe ? 'jwt.refreshRememberExpires' : 'jwt.refreshExpires',
    );
    await this.db.refreshToken.create({
      data: {
        userId: user.id,
        token: tokens.refreshToken,
        family: tokenFamily,
        expiresAt: this.parseExpiry(refreshExpires || '7d'),
      },
    });

    // Log activity
    this.eventEmitter.emit('auth.login', {
      userId: user.id,
      email: user.email,
      ipAddress,
      userAgent,
    });

    const { password: _, twoFactorSecret: __, ...safeUser } = user;

    return {
      user: { ...safeUser, roles, permissions },
      tokens,
    };
  }

  // ─── Register ──────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<{ message: string }> {
    // Check email uniqueness
    const existingEmail = await this.db.user.findFirst({
      where: { email: dto.email, deletedAt: null },
    });
    if (existingEmail) {
      throw new ConflictException('Email already registered');
    }

    // Check username uniqueness
    const existingUsername = await this.db.user.findFirst({
      where: { username: dto.username, deletedAt: null },
    });
    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Get default staff role
    const staffRole = await this.db.role.findFirst({ where: { name: 'staff' } });

    // Create user
    const user = await this.db.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        status: 'PENDING_VERIFICATION',
        roles: staffRole
          ? { create: { roleId: staffRole.id } }
          : undefined,
      },
    });

    // Create email verification token
    const verificationToken = uuidv4();
    await this.db.emailVerification.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email
    try {
      await this.mailService.sendEmailVerification(
        user.email,
        verificationToken,
        `${user.firstName} ${user.lastName}`,
      );
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
    }

    return { message: 'Registration successful. Please check your email to verify your account.' };
  }

  // ─── Refresh Token ─────────────────────────────────────────
  async refreshToken(token: string): Promise<AuthTokens> {
    const storedToken = await this.db.refreshToken.findFirst({
      where: { token, isRevoked: false },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: {
                  include: { permissions: { include: { permission: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (storedToken.user.status !== 'ACTIVE' || storedToken.user.deletedAt) {
      throw new UnauthorizedException('User account is not active');
    }

    // Revoke old token (token rotation)
    await this.db.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true, revokedAt: new Date(), revokedReason: 'rotated' },
    });

    const roles = storedToken.user.roles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        storedToken.user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.name),
        ),
      ),
    ];

    // Issue new tokens
    const tokens = await this.generateTokens(
      storedToken.user.id,
      storedToken.user.email,
      storedToken.user.username,
      roles,
      permissions,
    );

    // Store new refresh token in same family
    await this.db.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        token: tokens.refreshToken,
        family: storedToken.family,
        expiresAt: this.parseExpiry(
          this.configService.get<string>('jwt.refreshExpires') || '7d',
        ),
      },
    });

    return tokens;
  }

  // ─── Logout ────────────────────────────────────────────────
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.db.refreshToken.updateMany({
        where: { userId, token: refreshToken },
        data: { isRevoked: true, revokedAt: new Date(), revokedReason: 'logout' },
      });
    }

    // Revoke all sessions for this user from Redis
    await this.redisService.del(`user:${userId}:sessions`);

    this.eventEmitter.emit('auth.logout', { userId });
  }

  // ─── Forgot Password ───────────────────────────────────────
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.db.user.findFirst({
      where: { email, deletedAt: null, status: 'ACTIVE' },
    });

    // Always return same message for security
    const message = 'If an account exists with this email, you will receive a password reset link.';

    if (!user) return { message };

    // Invalidate old tokens
    await this.db.passwordReset.deleteMany({ where: { userId: user.id } });

    // Create new token
    const token = uuidv4();
    await this.db.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    try {
      await this.mailService.sendPasswordReset(
        user.email,
        token,
        `${user.firstName} ${user.lastName}`,
      );
    } catch (error) {
      this.logger.error('Failed to send password reset email', error);
    }

    return { message };
  }

  // ─── Reset Password ────────────────────────────────────────
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetRecord = await this.db.passwordReset.findFirst({
      where: { token, usedAt: null },
    });

    if (!resetRecord || resetRecord.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);

    await this.db.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword, failedLoginCount: 0, lockedUntil: null },
    });

    await this.db.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    });

    // Revoke all refresh tokens for security
    await this.db.refreshToken.updateMany({
      where: { userId: resetRecord.userId },
      data: { isRevoked: true, revokedAt: new Date(), revokedReason: 'password_reset' },
    });

    return { message: 'Password reset successful. Please login with your new password.' };
  }

  // ─── Verify Email ──────────────────────────────────────────
  async verifyEmail(token: string): Promise<{ message: string }> {
    const verification = await this.db.emailVerification.findFirst({
      where: { token, usedAt: null },
    });

    if (!verification || verification.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.db.user.update({
      where: { id: verification.userId },
      data: { status: 'ACTIVE', emailVerifiedAt: new Date() },
    });

    await this.db.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    return { message: 'Email verified successfully. You can now login.' };
  }

  // ─── Get Current User ──────────────────────────────────────
  async getCurrentUser(userId: string) {
    const user = await this.db.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    const { password: _, twoFactorSecret: __, ...safeUser } = user;
    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        user.roles.flatMap((ur) => ur.role.permissions.map((rp) => rp.permission.name)),
      ),
    ];

    return { ...safeUser, roles, permissions };
  }

  // ─── Private Helpers ───────────────────────────────────────

  private async generateTokens(
    userId: string,
    email: string,
    username: string,
    roles: string[],
    permissions: string[],
    rememberMe?: boolean,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, email, username, roles, permissions };

    const accessSecret = this.configService.get<string>('jwt.accessSecret');
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
    const accessExpires = this.configService.get<string>('jwt.accessExpires') || '15m';
    const refreshExpires = rememberMe
      ? this.configService.get<string>('jwt.refreshRememberExpires') || '30d'
      : this.configService.get<string>('jwt.refreshExpires') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: accessExpires,
      }),
      this.jwtService.signAsync(
        { sub: userId, type: 'refresh' },
        { secret: refreshSecret, expiresIn: refreshExpires },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiryToSeconds(accessExpires),
      tokenType: 'Bearer',
    };
  }

  private async handleFailedLogin(userId: string): Promise<void> {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) return;

    const newFailedCount = user.failedLoginCount + 1;
    const shouldLock = newFailedCount >= this.MAX_FAILED_ATTEMPTS;

    await this.db.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: newFailedCount,
        lockedUntil: shouldLock
          ? new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000)
          : null,
      },
    });
  }

  private parseExpiry(expiry: string): Date {
    const seconds = this.parseExpiryToSeconds(expiry);
    return new Date(Date.now() + seconds * 1000);
  }

  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900; // 15 minutes default
    }
  }
}
