import type { Role } from "../domain/role.ts";
import type { User } from "../domain/user.ts";

export class UserRepository {
  private users = new Map<string, User>();

  seed(users: User[]): void {
    for (const user of users) {
      this.users.set(user.id, { ...user });
    }
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  updateUserRole(id: string, role: Role): void {
    const user = this.users.get(id);
    if (!user) {
      throw new Error(`User not found: ${id}`);
    }
    user.role = role;
  }
}
