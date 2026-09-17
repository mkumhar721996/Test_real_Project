const { hashPassword, verifyPassword } = require('../src/domain/password');

describe('password hashing', () => {
  test('verifyPassword accepts the correct password against its hash', () => {
    const { salt, hash } = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('correct-horse-battery-staple', salt, hash)).toBe(true);
  });

  test('verifyPassword rejects an incorrect password', () => {
    const { salt, hash } = hashPassword('correct-horse-battery-staple');
    expect(verifyPassword('wrong-password', salt, hash)).toBe(false);
  });
});
