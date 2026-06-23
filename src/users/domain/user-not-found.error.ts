import { UserId } from './user';

export class UserNotFoundError extends Error {
  constructor(userId: UserId) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}
