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
}
