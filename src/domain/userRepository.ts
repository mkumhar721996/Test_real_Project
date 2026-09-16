import type { RoleName, User } from './types.ts';

export class UserRepository {
  private users = new Map<string, User>();

  addUser(user: User): void {
    this.users.set(user.id, { ...user });
  }

  getUser(id: string): User {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`Unknown user ${id}`);
    }
    return user;
  }

  updateRole(id: string, newRole: RoleName): void {
    const user = this.getUser(id);
    user.role = newRole;
  }
}
