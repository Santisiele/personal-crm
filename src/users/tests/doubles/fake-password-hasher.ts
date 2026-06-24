import { PasswordHasher } from '@/users/domain/password-hasher';

/**
 * Deterministic test double. Models hashing as a reversible prefix so tests can
 * assert "stored" and "no longer valid" without a real crypto dependency.
 */
export class FakePasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return Promise.resolve(`hashed:${plain}`);
  }

  verify(plain: string, hash: string): Promise<boolean> {
    return Promise.resolve(hash === `hashed:${plain}`);
  }
}
