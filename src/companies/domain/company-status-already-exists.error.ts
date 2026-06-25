import { ConflictError } from '@/shared/domain/domain-error';

/** Raised when creating a company status whose description already exists. */
export class CompanyStatusAlreadyExistsError extends ConflictError {
  constructor(description: string) {
    super(`A company status '${description}' already exists`);
  }
}
