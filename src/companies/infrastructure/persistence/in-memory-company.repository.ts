import { Company, CompanyId } from '@/companies/domain/company';
import { CompanyRepository } from '@/companies/domain/company.repository';

/**
 * In-memory driven adapter for companies. Used in acceptance/unit tests and
 * local development.
 *
 * Owns identity for new companies via a simple counter, mirroring the database's
 * autoincrement behaviour.
 */
export class InMemoryCompanyRepository implements CompanyRepository {
  private readonly companies = new Map<CompanyId, Company>();
  private readonly deleted = new Set<CompanyId>();
  private sequence = 0;

  save(company: Company): Promise<void> {
    if (company.id === null) {
      this.sequence += 1;
      company.assignId(String(this.sequence));
    }
    this.companies.set(company.id as CompanyId, company);
    return Promise.resolve();
  }

  findById(id: CompanyId): Promise<Company | null> {
    return Promise.resolve(this.companies.get(id) ?? null);
  }

  findAll(): Promise<Company[]> {
    // Soft-deleted companies are excluded from the listing but still kept around
    // for findById, mirroring the database's `deleted_at` filter.
    return Promise.resolve(
      [...this.companies.values()].filter(
        (company) => !this.deleted.has(company.id as CompanyId),
      ),
    );
  }

  softDelete(id: CompanyId, _deletedBy: string): Promise<void> {
    this.deleted.add(id);
    return Promise.resolve();
  }
}
