export type TierFeatureFlags = {
  advancedReporting: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
};

const OFF: TierFeatureFlags = {
  advancedReporting: false,
  apiAccess: false,
  prioritySupport: false,
};

export const STARTER_TIER_FEATURES: TierFeatureFlags = { ...OFF };

export const PLUS_TIER_FEATURES: TierFeatureFlags = {
  ...OFF,
  apiAccess: true,
  advancedReporting: true,
};

export const ENTERPRISE_TIER_FEATURES: TierFeatureFlags = {
  advancedReporting: true,
  apiAccess: true,
  prioritySupport: true,
};
