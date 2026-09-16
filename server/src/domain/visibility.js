function canView(user, defect) {
  if (user.role === 'admin') {
    return true;
  }
  return defect.teamId === user.teamId;
}

module.exports = { canView };
