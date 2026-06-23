import { AuthorizationError } from '../../shared/domain/domain-error';

export class AccessDeniedError extends AuthorizationError {
  constructor(message = 'Access denied') {
    super(message);
  }
}
