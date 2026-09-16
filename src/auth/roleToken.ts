import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Role } from '../db/store.ts';

const ROLES: Role[] = ['ADMIN', 'DEVELOPER', 'REPORTER'];

function getSecret(): string {
  const secret = process.env.AUTH_TOKEN_SECRET;
  if (!secret) {
    throw new Error('AUTH_TOKEN_SECRET environment variable must be set');
  }
  return secret;
}

function sign(role: string, secret: string): string {
  return createHmac('sha256', secret).update(role).digest('base64url');
}

export function issueRoleToken(role: Role): string {
  const secret = getSecret();
  return `${role}.${sign(role, secret)}`;
}

export function verifyRoleToken(authorizationHeader: string | undefined): Role | null {
  if (!authorizationHeader?.startsWith('Bearer ')) return null;
  const token = authorizationHeader.slice('Bearer '.length);
  const [role, signature] = token.split('.');
  if (!role || !signature || !ROLES.includes(role as Role)) return null;

  const expected = Buffer.from(sign(role, getSecret()));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  return role as Role;
}
