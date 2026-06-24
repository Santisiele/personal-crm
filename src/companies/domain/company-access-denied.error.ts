import { AuthorizationError } from '@/shared/domain/domain-error';

export class CompanyAccessDeniedError extends AuthorizationError {
  constructor(message = 'Access denied') {
    super(message);
  }
}
