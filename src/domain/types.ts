export type RoleName = 'Reporter' | 'Developer' | 'Admin';

export interface User {
  id: string;
  role: RoleName;
}

export interface Defect {
  id: string;
  submittedBy: string;
  assignedTo: string | null;
}

export interface Session {
  userId: string;
}
