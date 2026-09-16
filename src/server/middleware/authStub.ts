import { Request, Response, NextFunction } from 'express';
import { AuthUser, Role } from '../../shared/types/defect';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

const VALID_ROLES: readonly Role[] = ['REPORTER', 'DEVELOPER', 'ADMIN'];

function isValidRole(value: string | undefined): value is Role {
  return VALID_ROLES.includes(value as Role);
}

// Header-based identity is a placeholder for real session/JWT auth (not yet built).
// It is disabled in production unless explicitly opted into, so it can't silently
// stand in for real authentication once this ships behind a public endpoint.
function isStubAuthAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' || process.env.STUB_AUTH_ENABLED === 'true';
}

export function attachUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (!isStubAuthAllowed()) {
    req.user = undefined;
    return next();
  }

  const id = req.header('x-user-id');
  const roleHeader = req.header('x-user-role');
  const role = isValidRole(roleHeader) ? roleHeader : undefined;
  req.user = id && role ? { id, role } : undefined;
  next();
}
