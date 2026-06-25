import { Company, CompanyId } from '@/companies/domain/company';

/**
 * Driven port for company persistence. Implemented by adapters (in-memory,
 * Prisma, ...).
 */
export interface CompanyRepository {
  save(company: Company): Promise<void>;
  findById(id: CompanyId): Promise<Company | null>;
  findAll(): Promise<Company[]>;
  /**
   * Logically deletes a company (soft delete): it is excluded from `findAll` but
   * still retrievable by `findById`, so historical references stay viewable.
   */
  softDelete(id: CompanyId, deletedBy: string): Promise<void>;
}

export const COMPANY_REPOSITORY = Symbol('CompanyRepository');
