import { NotFoundError } from '@/shared/domain/domain-error';
import { UserId } from '@/users/domain/user';

export class UserNotFoundError extends NotFoundError {
  constructor(userId: UserId) {
    super(`User ${userId} not found`);
  }
}
