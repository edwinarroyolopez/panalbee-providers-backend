import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import Logger from '../utils/logger/logger';
import { AccountsService } from 'src/accounts/accounts.service';
import { Role } from 'src/users/schemas/user.schema';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { buildPasswordHash, verifyPassword } from './password.util';

const logger = new Logger('auth.service');

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly accountsService: AccountsService,
  ) {}

  private formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `+57${digits}`;
    if (digits.startsWith('57') && digits.length === 12) return `+${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  private sign(user: {
    id: string;
    phone: string;
    role: string;
    accountId: string;
  }) {
    return this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      accountId: user.accountId,
    });
  }

  async register(dto: RegisterDto) {
    const finalPhone = this.formatPhone(dto.phone);
    const { passwordHash, passwordSalt } = buildPasswordHash(dto.password);

    logger.info('Register owner requested', {
      originalPhone: dto.phone,
      formattedPhone: finalPhone,
    });

    const orgName = dto.name?.trim() || finalPhone;
    const account = await this.accountsService.create({ name: orgName });

    const user = await this.usersService.createOwner(
      finalPhone,
      dto.name,
      Role.ADMIN,
      account._id,
      passwordHash,
      passwordSalt,
    );

    const accessToken = this.sign({
      id: user._id.toString(),
      phone: user.phone,
      role: user.role,
      accountId: account._id.toString(),
    });

    logger.info('Owner registered successfully', {
      userId: user._id.toString(),
      phone: finalPhone,
    });

    return { accessToken, user };
  }

  async login(dto: LoginDto) {
    const finalPhone = this.formatPhone(dto.phone);

    const user = await this.usersService.findByPhone(finalPhone);

    if (!user || !user.isActive) {
      logger.warn('Login failed: invalid phone or inactive user', {
        phone: finalPhone,
      });
      throw new UnauthorizedException('Invalid phone');
    }

    const isPasswordValid = verifyPassword(
      dto.password,
      user.passwordSalt,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      logger.warn('Login failed: invalid password', {
        userId: user._id.toString(),
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.usersService.touchLogin(user._id.toString());

    const account = await this.accountsService.findById(
      user.accountId.toString(),
    );

    const accessToken = this.sign({
      id: user._id.toString(),
      phone: user.phone,
      role: user.role,
      accountId: user.accountId.toString(),
    });

    logger.info('Login successful', {
      userId: user._id.toString(),
      phone: finalPhone,
    });

    return { accessToken, user };
  }

  async me(userId: string, pushToken?: string, pushPlatform?: string) {
    logger.info('ME requested', { userId });

    if (pushToken?.trim()) {
      try {
        await this.usersService.registerPushToken(userId, {
          token: pushToken.trim(),
          platform:
            pushPlatform === 'android' || pushPlatform === 'ios'
              ? pushPlatform
              : undefined,
        });
      } catch (error) {
        logger.warn('ME push token sync failed', {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      logger.warn('ME failed: user invalid or inactive', { userId });
      throw new UnauthorizedException();
    }

    const account = await this.accountsService.findById(
      user.accountId.toString(),
    );

    if (!account || !account.isActive) {
      logger.warn('ME failed: account inactive', {
        userId,
        accountId: user.accountId?.toString(),
      });
      throw new UnauthorizedException('Account inactive');
    }

    const memberCount = await this.usersService.countByAccountId(
      account._id.toString(),
    );

    return {
      user: {
        id: user._id.toString(),
        phone: user.phone,
        name: user.name,
        role: user.role,
      },
      organization: {
        id: account._id.toString(),
        name: account.name,
        isActive: account.isActive,
      },
      stats: {
        activeMembers: memberCount,
      },
    };
  }

  async registerPushToken(userId: string, dto: RegisterPushTokenDto) {
    return this.usersService.registerPushToken(userId, dto);
  }
}
