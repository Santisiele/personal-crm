import { Company, CompanyId } from '@/companies/domain/company';

/**
 * Driven port for company persistence. Implemented by adapters (in-memory,
 * Prisma, ...).
 */
export interface CompanyRepository {
  save(company: Company): Promise<void>;
  findById(id: CompanyId): Promise<Company | null>;
}

export const COMPANY_REPOSITORY = Symbol('CompanyRepository');
