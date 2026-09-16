import type { User } from "../domain/types.ts";

export function resolveCurrentUser(users: User[], userIdHeader: string | undefined): User | undefined {
  if (!userIdHeader) return undefined;
  return users.find((user) => user.id === userIdHeader);
}
