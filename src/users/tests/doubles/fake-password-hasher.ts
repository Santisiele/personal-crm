import { PasswordHasher } from '@/users/domain/password-hasher';

/**
 * Deterministic test double. Models hashing as a reversible prefix so tests can
 * assert "stored" and "no longer valid" without a real crypto dependency.
 */
export class FakePasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    return `hashed:${plain}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return hash === `hashed:${plain}`;
  }
}
