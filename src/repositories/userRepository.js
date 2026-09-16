/** @type {Map<string, import('../domain/user.js').User>} */
let users = new Map();

/** @param {import('../domain/user.js').User[]} seedUsers */
export function seed(seedUsers) {
  users = new Map(seedUsers.map((u) => [u.id, u]));
}

export function clear() {
  users = new Map();
}

/** @param {string} id */
export function findById(id) {
  return users.get(id) ?? null;
}
