import { ScryptPasswordHasher } from './scrypt-password-hasher';

describe('ScryptPasswordHasher', () => {
  const hasher = new ScryptPasswordHasher();

  it('verifies a password against its own hash', async () => {
    const hash = await hasher.hash('correct horse');
    expect(await hasher.verify('correct horse', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hasher.hash('correct horse');
    expect(await hasher.verify('battery staple', hash)).toBe(false);
  });

  it('produces a different hash each time (random salt)', async () => {
    const first = await hasher.hash('same input');
    const second = await hasher.hash('same input');
    expect(first).not.toBe(second);
  });

  it('returns false for a malformed hash', async () => {
    expect(await hasher.verify('whatever', 'not-a-valid-hash')).toBe(false);
  });
});
