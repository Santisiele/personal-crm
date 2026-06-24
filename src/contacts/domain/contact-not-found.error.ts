import { NotFoundError } from '@/shared/domain/domain-error';

export class ContactNotFoundError extends NotFoundError {
  constructor(contactId: string) {
    super(`Contact ${contactId} not found`);
  }
}
