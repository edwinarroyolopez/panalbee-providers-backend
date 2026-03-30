import { Injectable } from '@nestjs/common';
import { AccountTier } from 'src/accounts/schemas/account.schema';
import { ACCOUNT_PRESETS } from 'src/accounts/constants/account-presets.constants';
import { AccountCapabilities } from './capabilities.types';
import Logger from 'src/utils/logger/logger';

const logger = new Logger('capabilities.service');

@Injectable()
export class CapabilitiesService {
  getAccountCapabilities(params: {
    tier: AccountTier;
    isActive: boolean;
    memberCount: number;
    workspaceCount: number;
  }): AccountCapabilities {
    const { tier, isActive, memberCount, workspaceCount } = params;

    const preset = ACCOUNT_PRESETS[tier];
    const limits = preset.limits;
    const features = preset.features;

    const reachedMembers =
      limits.maxMembers !== Infinity && memberCount >= limits.maxMembers;

    const reachedWorkspaces =
      limits.maxWorkspaces !== Infinity &&
      workspaceCount >= limits.maxWorkspaces;

    const result: AccountCapabilities = {
      canInviteMembers: {
        enabled: isActive && !reachedMembers,
        reason: !isActive
          ? 'ACCOUNT_INACTIVE'
          : reachedMembers
            ? 'TIER_LIMIT_REACHED'
            : undefined,
      },

      canCreateWorkspace: {
        enabled: isActive && !reachedWorkspaces,
        reason: !isActive
          ? 'ACCOUNT_INACTIVE'
          : reachedWorkspaces
            ? 'TIER_LIMIT_REACHED'
            : undefined,
      },

      canUseApi: {
        enabled: isActive && features.apiAccess,
        reason: !isActive
          ? 'ACCOUNT_INACTIVE'
          : !features.apiAccess
            ? 'FEATURE_DISABLED'
            : undefined,
      },

      hasTierLimits:
        limits.maxMembers !== Infinity || limits.maxWorkspaces !== Infinity,
    };

    logger.debug('Account capabilities computed', {
      tier,
      memberCount,
      workspaceCount,
      result,
    });

    return result;
  }
}
