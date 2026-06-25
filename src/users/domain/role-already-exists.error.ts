import { ConflictError } from '@/shared/domain/domain-error';

/** Raised when creating a role whose description is already in use. */
export class RoleAlreadyExistsError extends ConflictError {
  constructor(description: string) {
    super(`A role '${description}' already exists`);
  }
}
