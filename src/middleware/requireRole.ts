import type { Role } from '../db/store.ts';

export function requireRole(...roles: Role[]): (role: string | undefined) => boolean {
  return (role: string | undefined): boolean => roles.includes(role as Role);
}
