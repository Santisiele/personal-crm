import { ConflictError } from '@/shared/domain/domain-error';

/** Raised when creating a user whose name is already in use. */
export class UserNameTakenError extends ConflictError {
  constructor(name: string) {
    super(`A user named '${name}' already exists`);
  }
}
