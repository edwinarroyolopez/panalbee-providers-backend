import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, Role } from './schemas/user.schema';
import Logger from 'src/utils/logger/logger';

@Injectable()
export class UsersService {
  private readonly logger = new Logger('UsersService');

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async findByPhone(phone: string) {
    this.logger.debug('Finding user by phone', { phone });
    return this.userModel.findOne({ phone }).exec();
  }

  private formatLoginPhone(phone: string) {
    const digits = phone.replace(/\D/g, '');

    if (digits.length === 10) return `+57${digits}`;
    if (digits.startsWith('57') && digits.length === 12) return `+${digits}`;
    return phone.startsWith('+') ? phone : `+${digits}`;
  }

  async findById(userId: string) {
    this.logger.debug('Finding user by ID', { userId });
    if (!Types.ObjectId.isValid(userId)) {
      this.logger.warn('Invalid ObjectId provided', { userId });
      return null;
    }
    return this.userModel.findById(userId).exec();
  }

  async countByAccountId(accountId: string): Promise<number> {
    return this.userModel.countDocuments({
      accountId: new Types.ObjectId(accountId),
      isActive: true,
    });
  }

  async createOwner(
    phone: string,
    name: string | undefined,
    role: Role | undefined,
    accountId: Types.ObjectId,
    passwordHash: string,
    passwordSalt: string,
  ) {
    const finalPhone = this.formatLoginPhone(phone);
    this.logger.info('Creating owner user', {
      phone,
      finalPhone,
      name,
      accountId,
    });

    const exists = await this.userModel
      .findOne({ phone: finalPhone })
      .lean()
      .exec();
    if (exists) {
      this.logger.warn('Owner creation failed: phone already registered', {
        finalPhone,
      });
      throw new ConflictException('Phone already registered');
    }

    const newUser = await this.userModel.create({
      phone: finalPhone,
      name,
      role: role ?? Role.OWNER,
      accountId,
      passwordHash,
      passwordSalt,
      isActive: true,
    });

    this.logger.info('Owner created successfully', {
      userId: newUser._id,
      accountId,
    });

    return newUser;
  }

  async touchLogin(userId: string) {
    this.logger.debug('Updating last login', { userId });
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { lastLoginAt: new Date() } },
    );
  }

  async registerPushToken(
    userId: string,
    payload: {
      token: string;
      platform?: 'android' | 'ios';
      deviceId?: string;
      appVersion?: string;
    },
  ) {
    const now = new Date();
    const token = payload.token.trim();

    const userObjectId = new Types.ObjectId(userId);

    const touchExisting = await this.userModel
      .updateOne(
        {
          _id: userObjectId,
          'pushTokens.token': token,
        },
        {
          $set: {
            'pushTokens.$.platform': payload.platform,
            'pushTokens.$.deviceId': payload.deviceId,
            'pushTokens.$.appVersion': payload.appVersion,
            'pushTokens.$.isActive': true,
            'pushTokens.$.lastSeenAt': now,
            'pushTokens.$.updatedAt': now,
          },
        },
      )
      .exec();

    if (touchExisting.matchedCount > 0) {
      return { ok: true };
    }

    const createResult = await this.userModel
      .updateOne(
        {
          _id: userObjectId,
          'pushTokens.token': { $ne: token },
        },
        {
          $push: {
            pushTokens: {
              token,
              platform: payload.platform,
              deviceId: payload.deviceId,
              appVersion: payload.appVersion,
              isActive: true,
              lastSeenAt: now,
              createdAt: now,
              updatedAt: now,
            },
          },
        },
      )
      .exec();

    if (!createResult.matchedCount) return null;
    return { ok: true };
  }
}
