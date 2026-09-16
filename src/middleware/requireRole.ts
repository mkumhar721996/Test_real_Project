import type { Role } from '../db/store.ts';

export function requireRole(...roles: Role[]): (role: Role | null) => boolean {
  return (role: Role | null): boolean => role !== null && roles.includes(role);
}
