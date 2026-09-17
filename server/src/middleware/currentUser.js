const { findByUsername } = require('../data/usersRepository');
const { verifyPassword } = require('../domain/password');

function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) {
    return null;
  }
  const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
  const separatorIndex = decoded.indexOf(':');
  if (separatorIndex === -1) {
    return null;
  }
  return {
    username: decoded.slice(0, separatorIndex),
    password: decoded.slice(separatorIndex + 1),
  };
}

function currentUser(req, res, next) {
  const credentials = parseBasicAuth(req.headers.authorization);
  const account = credentials && findByUsername(credentials.username);
  const authenticated = Boolean(
    account && credentials && verifyPassword(credentials.password, account.salt, account.hash),
  );

  if (!authenticated) {
    res.set('WWW-Authenticate', 'Basic realm="dashboard"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.user = { role: account.role, teamId: account.teamId };
  next();
}

module.exports = currentUser;
