import { CompanyStatus } from '@/companies/domain/company-status';

/**
 * Driven port for company status persistence. Implemented by adapters
 * (in-memory, Prisma, ...). Writes and reads the `company_status` catalogue.
 */
export interface CompanyStatusRepository {
  save(status: CompanyStatus): Promise<void>;
  findAll(): Promise<CompanyStatus[]>;
  findByDescription(description: string): Promise<CompanyStatus | null>;
}

export const COMPANY_STATUS_REPOSITORY = Symbol('CompanyStatusRepository');
