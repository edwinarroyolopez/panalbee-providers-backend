import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  Account,
  AccountDocument,
  AccountTier,
  BillingPlan,
} from './schemas/account.schema';
import {
  AccountPermissionKey,
  sanitizeAccountPermissions,
} from './constants/account-permissions.constants';

import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name)
    private accountModel: Model<Account>,
  ) {}

  async create(dto: CreateAccountDto): Promise<AccountDocument> {
    const now = new Date();

    const billingPlan =
      dto.billingPlan ??
      (dto.tier === AccountTier.STARTER
        ? BillingPlan.FREE
        : BillingPlan.STANDARD);

    const data: Partial<Account> = {
      name: dto.name,
      tier: dto.tier,
      billingPlan,

      trialEndsAt:
        dto.tier === AccountTier.STARTER
          ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          : undefined,

      subscriptionEndsAt:
        dto.tier !== AccountTier.STARTER
          ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          : undefined,

      setupComplete: dto.tier !== AccountTier.STARTER,
      isActive: true,
    };

    return this.accountModel.create(data);
  }

  async listAll() {
    return this.accountModel
      .find()
      .select({
        name: 1,
        tier: 1,
        billingPlan: 1,
        isActive: 1,
        permissions: 1,
        subscriptionEndsAt: 1,
        createdAt: 1,
      })
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(id: string) {
    const acc = await this.accountModel.findById(id);
    if (!acc) throw new NotFoundException('Account not found');
    return acc;
  }

  /**
   * Applies a subscription/tier update for an account (starter-friendly; extend with your billing provider).
   */
  async applySubscription(params: {
    accountId: string;
    tier: AccountTier;
    billingPlan?: BillingPlan;
    months: number;
    permissions?: AccountPermissionKey[];
    activatedByUserId?: string;
    externalReference?: string;
    notes?: string;
  }) {
    const {
      accountId,
      tier,
      months,
      permissions,
      activatedByUserId,
      externalReference,
      notes,
    } = params;

    const account = await this.findById(accountId);
    const now = new Date();
    const next = new Date(now);
    next.setMonth(next.getMonth() + months);

    account.tier = tier;
    account.billingPlan =
      params.billingPlan ??
      (tier === AccountTier.STARTER ? BillingPlan.FREE : BillingPlan.STANDARD);
    account.isActive = true;

    if (tier === AccountTier.STARTER) {
      account.setupComplete = false;
      account.trialEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      account.subscriptionEndsAt = undefined;
    } else {
      account.setupComplete = true;
      account.trialEndsAt = undefined;
      account.subscriptionEndsAt = next;
    }

    account.subscriptionActivatedAt = now;
    if (activatedByUserId) {
      account.subscriptionActivatedByUserId = activatedByUserId;
    }
    if (externalReference !== undefined) {
      account.subscriptionExternalRef = externalReference;
    }
    if (notes !== undefined) {
      account.subscriptionNotes = notes;
    }

    if (permissions) {
      account.permissions = sanitizeAccountPermissions(permissions);
    }

    await account.save();
    return account;
  }

  async extendSubscription(params: { accountId: string; months: number }) {
    const account = await this.findById(params.accountId);

    const base =
      account.subscriptionEndsAt && account.subscriptionEndsAt > new Date()
        ? new Date(account.subscriptionEndsAt)
        : new Date();

    base.setMonth(base.getMonth() + params.months);

    account.subscriptionEndsAt = base;
    account.isActive = true;

    await account.save();
    return account;
  }
}
