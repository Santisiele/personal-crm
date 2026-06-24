import { NotFoundError } from '@/shared/domain/domain-error';

export class CompanyNotFoundError extends NotFoundError {
  constructor(companyId: string) {
    super(`Company ${companyId} not found`);
  }
}
