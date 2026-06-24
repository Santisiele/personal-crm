import { AuthenticationError } from '@/shared/domain/domain-error';

/**
 * Raised when a login attempt fails because the supplied name/password pair does
 * not match a known user. The message is intentionally non-specific so it does
 * not reveal whether the user exists.
 */
export class InvalidCredentialsError extends AuthenticationError {
  constructor() {
    super('Invalid credentials');
  }
}
