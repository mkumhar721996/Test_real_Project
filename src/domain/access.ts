import { Permission, hasPermission } from './roles.ts';
import type { Account } from './accounts.ts';

export type AccessResult<T> = { allowed: true; data: T } | { allowed: false };

export function checkAccess<T>(
  account: Account,
  permission: Permission,
  resolve: () => T,
): AccessResult<T> {
  try {
    if (!hasPermission(account.role, permission)) {
      return { allowed: false };
    }
    const data = resolve();
    return { allowed: true, data };
  } catch {
    return { allowed: false };
  }
}
