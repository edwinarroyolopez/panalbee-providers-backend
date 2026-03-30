import { AccountTier, BillingPlan } from '../schemas/account.schema';

export class CreateAccountDto {
  name: string;
  tier: AccountTier;
  billingPlan?: BillingPlan;
}
