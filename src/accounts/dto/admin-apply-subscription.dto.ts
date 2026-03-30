import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { AccountTier, BillingPlan } from '../schemas/account.schema';
import {
  ACCOUNT_PERMISSION_KEYS,
  AccountPermissionKey,
} from '../constants/account-permissions.constants';

export class AdminApplySubscriptionDto {
  @IsMongoId()
  targetAccountId: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
