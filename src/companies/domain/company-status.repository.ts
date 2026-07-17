import {
  CompanyStatus,
  CompanyStatusId,
} from '@/companies/domain/company-status';

/**
 * Driven port for company status persistence. Implemented by adapters
 * (in-memory, Prisma, ...). Writes and reads the `company_status` catalogue.
 *
 * Reads exclude logically-deleted statuses: a deleted status disappears from the
 * catalogue and can no longer be assigned, but the row survives so companies that
 * already point at it keep resolving their status label.
 */
export interface CompanyStatusRepository {
  save(status: CompanyStatus): Promise<void>;
  findAll(): Promise<CompanyStatus[]>;
  findById(id: CompanyStatusId): Promise<CompanyStatus | null>;
  findByDescription(description: string): Promise<CompanyStatus | null>;
  /** Logically deletes a status, recording who removed it. */
  softDelete(id: CompanyStatusId, deletedBy: string): Promise<void>;
}

export const COMPANY_STATUS_REPOSITORY = Symbol('CompanyStatusRepository');
