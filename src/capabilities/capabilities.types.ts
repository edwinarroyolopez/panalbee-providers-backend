export type CapabilityReason =
  | 'ACCOUNT_INACTIVE'
  | 'TIER_LIMIT_REACHED'
  | 'FEATURE_DISABLED';

export interface CapabilityFlag<R extends string = CapabilityReason> {
  enabled: boolean;
  reason?: R;
}

/**
 * Generic account-level capability flags for feature gating.
 * Extend keys as your product grows; keep semantics product-agnostic in the template.
 */
export interface AccountCapabilities {
  canInviteMembers: CapabilityFlag;
  canCreateWorkspace: CapabilityFlag;
  canUseApi: CapabilityFlag;
  hasTierLimits: boolean;
}
