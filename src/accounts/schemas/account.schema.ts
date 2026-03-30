import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import {
  ACCOUNT_PERMISSION_KEYS,
  AccountPermissionKey,
} from '../constants/account-permissions.constants';

export type AccountDocument = HydratedDocument<Account>;

/** Billing / packaging tier for an account. Replace or extend per product. */
export enum AccountTier {
  STARTER = 'STARTER',
  PLUS = 'PLUS',
  ENTERPRISE = 'ENTERPRISE',
}

/** High-level billing plan label; orthogonal to tier in real products—kept minimal for the starter. */
export enum BillingPlan {
  FREE = 'FREE',
  STANDARD = 'STANDARD',
  ENTERPRISE = 'ENTERPRISE',
}

@Schema({ timestamps: true })
export class Account {
  @Prop({ required: true })
  name: string;

  @Prop({ enum: AccountTier, required: true })
  tier: AccountTier;

  @Prop({ enum: BillingPlan, default: BillingPlan.FREE })
  billingPlan: BillingPlan;

  @Prop()
  trialEndsAt?: Date;

  @Prop()
  subscriptionEndsAt?: Date;

  @Prop({ default: false })
  setupComplete: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  onboardingNotes?: string;

  @Prop()
  subscriptionActivatedAt?: Date;

  @Prop()
  subscriptionActivatedByUserId?: string;

  @Prop()
  subscriptionExternalRef?: string;

  @Prop()
  subscriptionNotes?: string;

  @Prop({ type: [String], enum: ACCOUNT_PERMISSION_KEYS, default: [] })
  permissions: AccountPermissionKey[];
}

export const AccountSchema = SchemaFactory.createForClass(Account);
