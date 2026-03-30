import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Account, AccountTier } from 'src/accounts/schemas/account.schema';

export type UserDocument = User & Document;

export enum Role {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
  VIEWER = 'VIEWER',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, index: true })
  phone: string;

  @Prop({ required: true })
  passwordHash: string;

  @Prop({ required: true })
  passwordSalt: string;

  @Prop({ enum: Role, default: Role.OWNER })
  role: Role;

  /** Mirrors the account tier at creation / billing sync time. */
  @Prop({ enum: AccountTier })
  accountTier: AccountTier;

  @Prop({ type: Types.ObjectId, ref: Account.name, required: true })
  accountId: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  name?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop({
    type: [
      {
        _id: false,
        token: { type: String, required: true, trim: true },
        platform: { type: String, trim: true },
        deviceId: { type: String, trim: true },
        appVersion: { type: String, trim: true },
        isActive: { type: Boolean, default: true },
        lastSeenAt: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  pushTokens?: Array<{
    token: string;
    platform?: string;
    deviceId?: string;
    appVersion?: string;
    isActive: boolean;
    lastSeenAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export const UserSchema = SchemaFactory.createForClass(User);
