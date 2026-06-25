import {
  CompanyStatus,
  CompanyStatusId,
} from '@/companies/domain/company-status';
import { CompanyStatusRepository } from '@/companies/domain/company-status.repository';

/**
 * In-memory driven adapter for company statuses. Used in acceptance/unit tests
 * and local development.
 *
 * Owns identity for new statuses via a simple counter, mirroring the database's
 * autoincrement behaviour.
 */
export class InMemoryCompanyStatusRepository implements CompanyStatusRepository {
  private readonly statuses = new Map<CompanyStatusId, CompanyStatus>();
  private sequence = 0;

  save(status: CompanyStatus): Promise<void> {
    if (status.id === null) {
      this.sequence += 1;
      status.assignId(String(this.sequence));
    }
    this.statuses.set(status.id as CompanyStatusId, status);
    return Promise.resolve();
  }

  findAll(): Promise<CompanyStatus[]> {
    return Promise.resolve([...this.statuses.values()]);
  }

  findByDescription(description: string): Promise<CompanyStatus | null> {
    return Promise.resolve(
      [...this.statuses.values()].find(
        (status) => status.description === description,
      ) ?? null,
    );
  }
}
