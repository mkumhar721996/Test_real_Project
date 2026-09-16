const defects = [];

export function save(defect) {
  defects.push(defect);
  return defect;
}

export function findAll() {
  return defects;
}
