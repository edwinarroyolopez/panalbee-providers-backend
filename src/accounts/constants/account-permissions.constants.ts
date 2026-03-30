export const ACCOUNT_PERMISSION_KEYS = [
  'PLATFORM_ADMIN',
  'BILLING_MANAGE',
  'MEMBER_INVITES',
  'DATA_EXPORT',
] as const;

export type AccountPermissionKey = (typeof ACCOUNT_PERMISSION_KEYS)[number];

export const ACCOUNT_PERMISSION_CATALOG: ReadonlyArray<{
  key: AccountPermissionKey;
  label: string;
  description: string;
}> = [
  {
    key: 'PLATFORM_ADMIN',
    label: 'Platform administration',
    description:
      'Template flag: list and manage all accounts (use only on operator / internal deployments).',
  },
  {
    key: 'BILLING_MANAGE',
    label: 'Billing management',
    description: 'Manage subscription fields and commercial metadata for this account.',
  },
  {
    key: 'MEMBER_INVITES',
    label: 'Member invitations',
      description: 'Invite and manage members within the account.',
  },
  {
    key: 'DATA_EXPORT',
    label: 'Data export',
    description: 'Export account-owned data (wire to your domain when you add it).',
  },
];

export function sanitizeAccountPermissions(
  permissions?: string[] | null,
): AccountPermissionKey[] {
  if (!permissions || permissions.length === 0) return [];

  const valid = new Set<AccountPermissionKey>();
  for (const permission of permissions) {
    if (ACCOUNT_PERMISSION_KEYS.includes(permission as AccountPermissionKey)) {
      valid.add(permission as AccountPermissionKey);
    }
  }

  return [...valid];
}

export function hasAccountPermission(
  permissions: readonly string[] | undefined,
  required: AccountPermissionKey,
): boolean {
  return Boolean(permissions?.some((permission) => permission === required));
}
