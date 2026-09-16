/** @type {import('../domain/defect.js').Defect[]} */
let defects = [];

export function findAll() {
  return defects;
}

/** @param {import('../domain/defect.js').Defect[]} seedDefects */
export function seed(seedDefects) {
  defects = [...seedDefects];
}

export function clear() {
  defects = [];
}
