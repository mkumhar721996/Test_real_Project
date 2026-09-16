import { Request, Response, NextFunction } from 'express';
import { AuthUser, Role } from '../../shared/types/defect';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function attachUser(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const id = req.header('x-user-id');
  const role = req.header('x-user-role') as Role | undefined;
  req.user = id && role ? { id, role } : undefined;
  next();
}
