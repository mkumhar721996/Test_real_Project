import type { Defect, User } from "./types.ts";

export function canAccessDefect(user: User, defect: Defect): boolean {
  switch (user.role) {
    case "ADMIN":
      return true;
    case "REPORTER":
      return defect.reporterId === user.id;
    case "DEVELOPER":
      return defect.assigneeId === user.id;
    default: {
      const exhaustiveCheck: never = user.role;
      void exhaustiveCheck;
      return false;
    }
  }
}
