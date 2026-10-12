export const AccountStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export function isAccountStatus(value: string): value is AccountStatus {
  return Object.values(AccountStatus).includes(value as AccountStatus);
}
