/**
 * Driven port for credential hashing. Keeps crypto details out of the domain
 * and application layers; adapters (bcrypt, argon2, ...) implement it.
 */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(plain: string, hash: string): Promise<boolean>;
}

export const PASSWORD_HASHER = Symbol('PasswordHasher');
