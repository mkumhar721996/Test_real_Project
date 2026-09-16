function currentUser(req, res, next) {
  req.user = {
    role: req.headers['x-user-role'] || 'member',
    teamId: req.headers['x-user-team'] || null,
  };
  next();
}

module.exports = currentUser;
