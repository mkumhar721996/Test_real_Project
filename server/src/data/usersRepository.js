const crypto = require('crypto');
const { hashPassword } = require('../domain/password');

// Temporary seeded credential store standing in for a real user/session
// backend. Replace with a real auth story's user store; consumers only
// depend on findByUsername returning { username, salt, hash, role, teamId }.
// No credential is hardcoded here: each seed account's password comes from
// its environment variable, or a random one generated (and logged once) if
// that variable is unset, so no working credential ever lives in source.
function resolveSeedPassword(envVarName, username) {
  const configured = process.env[envVarName];
  if (configured) {
    return configured;
  }
  const generated = crypto.randomBytes(18).toString('base64url');
  console.warn(
    `[usersRepository] ${envVarName} is not set; generated a temporary password for "${username}". ` +
      'Set this environment variable for a stable credential.',
  );
  return generated;
}

const seedAccountDefs = [
  { username: 'admin', envVar: 'SEED_ADMIN_PASSWORD', role: 'admin', teamId: null },
  { username: 'alice', envVar: 'SEED_ALICE_PASSWORD', role: 'member', teamId: 'team-a' },
  { username: 'bob', envVar: 'SEED_BOB_PASSWORD', role: 'member', teamId: 'team-b' },
];

const users = seedAccountDefs.map(({ username, envVar, role, teamId }) => {
  const { salt, hash } = hashPassword(resolveSeedPassword(envVar, username));
  return { username, salt, hash, role, teamId };
});

function findByUsername(username) {
  return users.find((user) => user.username === username);
}

module.exports = { findByUsername };
