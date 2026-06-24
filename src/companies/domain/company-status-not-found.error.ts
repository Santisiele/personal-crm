import { NotFoundError } from '@/shared/domain/domain-error';

/**
 * Raised when a status transition targets a `company_status` description that
 * does not exist. It is a NotFound because the requested lifecycle state is not
 * a known one in the catalogue.
 */
export class CompanyStatusNotFoundError extends NotFoundError {
  constructor(status: string) {
    super(`Company status '${status}' not found`);
  }
}
