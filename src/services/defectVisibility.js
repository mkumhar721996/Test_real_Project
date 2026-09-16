/**
 * Determines which defects a given user is permitted to see.
 * @param {import('../domain/user.js').User} user
 * @param {import('../domain/defect.js').Defect[]} allDefects
 * @returns {import('../domain/defect.js').Defect[]}
 */
export function getVisibleDefects(user, allDefects) {
  switch (user.role) {
    case 'admin':
      return allDefects;
    case 'reporter':
      return allDefects.filter((d) => d.submittedBy === user.id);
    case 'developer':
      return allDefects.filter((d) => d.assignedTo === user.id);
    default:
      return [];
  }
}
