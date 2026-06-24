import { AuthenticationError } from '@/shared/domain/domain-error';

/**
 * Raised when a presented token cannot be trusted: it is malformed, tampered
 * with, expired, or of the wrong kind (e.g. an access token used to refresh).
 * Being an AuthenticationError, the delivery layer maps it to 401.
 */
export class InvalidTokenError extends AuthenticationError {
  constructor() {
    super('Invalid or expired token');
  }
}
