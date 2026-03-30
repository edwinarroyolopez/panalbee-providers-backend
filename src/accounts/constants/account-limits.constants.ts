export type TierLimits = {
  maxMembers: number;
  maxWorkspaces: number;
};

export const STARTER_TIER_LIMITS: TierLimits = {
  maxMembers: 5,
  maxWorkspaces: 3,
};

export const PLUS_TIER_LIMITS: TierLimits = {
  maxMembers: 25,
  maxWorkspaces: 15,
};

export const ENTERPRISE_TIER_LIMITS: TierLimits = {
  maxMembers: Infinity,
  maxWorkspaces: Infinity,
};
