import { AccountTier } from '../schemas/account.schema';

import {
  STARTER_TIER_LIMITS,
  PLUS_TIER_LIMITS,
  ENTERPRISE_TIER_LIMITS,
} from './account-limits.constants';

import {
  STARTER_TIER_FEATURES,
  PLUS_TIER_FEATURES,
  ENTERPRISE_TIER_FEATURES,
} from './account-features.constants';

export const ACCOUNT_PRESETS = {
  [AccountTier.STARTER]: {
    limits: STARTER_TIER_LIMITS,
    features: STARTER_TIER_FEATURES,
  },

  [AccountTier.PLUS]: {
    limits: PLUS_TIER_LIMITS,
    features: PLUS_TIER_FEATURES,
  },

  [AccountTier.ENTERPRISE]: {
    limits: ENTERPRISE_TIER_LIMITS,
    features: ENTERPRISE_TIER_FEATURES,
  },
};
