describe('usersRepository seed credentials', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('derives an account whose password matches its configured env var', () => {
    jest.resetModules();
    process.env.SEED_ADMIN_PASSWORD = 'configured-admin-password';
    process.env.SEED_ALICE_PASSWORD = 'configured-alice-password';
    process.env.SEED_BOB_PASSWORD = 'configured-bob-password';

    const { findByUsername } = require('../src/data/usersRepository');
    const { verifyPassword } = require('../src/domain/password');

    const admin = findByUsername('admin');
    expect(verifyPassword('configured-admin-password', admin.salt, admin.hash)).toBe(true);
    expect(verifyPassword('wrong-password', admin.salt, admin.hash)).toBe(false);
  });

  test('falls back to a generated password (not a hardcoded one) when the env var is unset', () => {
    jest.resetModules();
    delete process.env.SEED_ADMIN_PASSWORD;
    delete process.env.SEED_ALICE_PASSWORD;
    delete process.env.SEED_BOB_PASSWORD;

    const { findByUsername } = require('../src/data/usersRepository');
    const { verifyPassword } = require('../src/domain/password');

    const admin = findByUsername('admin');
    expect(admin.hash).toBeTruthy();
    expect(verifyPassword('admin-password', admin.salt, admin.hash)).toBe(false);
  });
});
