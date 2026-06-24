import { AuthorizationError } from '@/shared/domain/domain-error';

/**
 * The actor is not allowed to read the requested part of the user directory.
 * Maps to HTTP 403 at the delivery boundary.
 */
export class UserAccessDeniedError extends AuthorizationError {
  constructor(message = 'Access denied') {
    super(message);
  }
}
