const { hashPassword } = require('../domain/password');

// Temporary seeded credential store standing in for a real user/session
// backend. Replace with a real auth story's user store; consumers only
// depend on findByUsername returning { username, salt, hash, role, teamId }.
const seedAccounts = [
  { username: 'admin', password: 'admin-password', role: 'admin', teamId: null },
  { username: 'alice', password: 'alice-password', role: 'member', teamId: 'team-a' },
  { username: 'bob', password: 'bob-password', role: 'member', teamId: 'team-b' },
];

const users = seedAccounts.map(({ username, password, role, teamId }) => {
  const { salt, hash } = hashPassword(password);
  return { username, salt, hash, role, teamId };
});

function findByUsername(username) {
  return users.find((user) => user.username === username);
}

module.exports = { findByUsername };
