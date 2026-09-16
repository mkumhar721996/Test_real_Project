export const Role = {
  Reporter: 'Reporter',
  Developer: 'Developer',
  Admin: 'Admin',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Permission = {
  SubmitDefect: 'SubmitDefect',
  ViewOwnDefects: 'ViewOwnDefects',
  ViewAssignedDefects: 'ViewAssignedDefects',
  UpdateAssignedDefectStatus: 'UpdateAssignedDefectStatus',
  CreateDefect: 'CreateDefect',
  ViewAnyDefect: 'ViewAnyDefect',
  EditDefect: 'EditDefect',
  ReassignDefect: 'ReassignDefect',
  DeleteDefect: 'DeleteDefect',
  CommentOnDefect: 'CommentOnDefect',
  ChangeUserRole: 'ChangeUserRole',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  [Role.Reporter]: new Set([Permission.SubmitDefect, Permission.ViewOwnDefects]),
  [Role.Developer]: new Set([
    Permission.ViewAssignedDefects,
    Permission.UpdateAssignedDefectStatus,
  ]),
  [Role.Admin]: new Set([
    Permission.CreateDefect,
    Permission.ViewAnyDefect,
    Permission.EditDefect,
    Permission.ReassignDefect,
    Permission.DeleteDefect,
    Permission.CommentOnDefect,
    Permission.ChangeUserRole,
  ]),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}
