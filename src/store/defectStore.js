const defects = new Map();

function create({ id, title, description, reporterId }) {
  const defect = { id, title, description, reporterId };
  defects.set(id, defect);
  return defect;
}

function list() {
  return Array.from(defects.values());
}

function getById(id) {
  return defects.get(id);
}

function remove(id) {
  return defects.delete(id);
}

function _reset() {
  defects.clear();
}

module.exports = { create, list, getById, remove, _reset };
