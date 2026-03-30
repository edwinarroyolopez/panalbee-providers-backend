import { IsArray, IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { AccountTier, BillingPlan } from '../schemas/account.schema';
import {
  ACCOUNT_PERMISSION_KEYS,
  AccountPermissionKey,
} from '../constants/account-permissions.constants';

export class UpdateAccountSubscriptionDto {
  @IsEnum(AccountTier)
  tier: AccountTier;

  @IsOptional()
  @IsEnum(BillingPlan)
  billingPlan?: BillingPlan;

  @IsInt()
  @Min(1)
  months: number;

  @IsOptional()
  @IsArray()
  @IsIn(ACCOUNT_PERMISSION_KEYS, { each: true })
  permissions?: AccountPermissionKey[];
}
