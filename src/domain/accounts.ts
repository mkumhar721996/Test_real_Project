import { Role, Permission, hasPermission } from './roles.ts';

export type Account = {
  id: string;
  role: Role;
};

export class NotAuthorizedError extends Error {
  constructor(message = 'Not authorized') {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

export function createAccount(input: { id: string; role?: Role }): Account {
  return {
    id: input.id,
    role: input.role ?? Role.Reporter,
  };
}

export function changeRole(
  actingAccount: Account,
  targetAccount: Account,
  newRole: Role,
): Account {
  if (!hasPermission(actingAccount.role, Permission.ChangeUserRole)) {
    throw new NotAuthorizedError('Only an Admin may change a user role');
  }
  targetAccount.role = newRole;
  return targetAccount;
}
