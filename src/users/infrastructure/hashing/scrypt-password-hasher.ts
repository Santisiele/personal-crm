import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { PasswordHasher } from '../../domain/password-hasher';

const scryptAsync = promisify(scrypt);
const SALT_BYTES = 16;
const KEY_BYTES = 64;

/**
 * Production PasswordHasher adapter built on Node's built-in scrypt, so it pulls
 * in no native crypto dependency. Each hash embeds its own random salt as
 * "<saltHex>:<derivedKeyHex>", and verification is constant-time.
 */
export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const derived = (await scryptAsync(plain, salt, KEY_BYTES)) as Buffer;
    return `${salt.toString('hex')}:${derived.toString('hex')}`;
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    const [saltHex, keyHex] = hash.split(':');
    if (!saltHex || !keyHex) {
      return false;
    }
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(keyHex, 'hex');
    const derived = (await scryptAsync(plain, salt, expected.length)) as Buffer;
    return (
      derived.length === expected.length && timingSafeEqual(derived, expected)
    );
  }
}
