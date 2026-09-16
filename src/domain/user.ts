import type { Role } from "./role.ts";

export interface User {
  id: string;
  name: string;
  role: Role;
}
