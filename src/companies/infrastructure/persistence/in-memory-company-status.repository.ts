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
  // Ids of logically-deleted statuses: hidden from every read, but kept in the
  // map so historical company references would still resolve (mirrors the row
  // surviving in the database).
  private readonly deleted = new Set<CompanyStatusId>();
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
    return Promise.resolve(
      [...this.statuses.values()].filter(
        (status) => !this.deleted.has(status.id as CompanyStatusId),
      ),
    );
  }

  findById(id: CompanyStatusId): Promise<CompanyStatus | null> {
    if (this.deleted.has(id)) {
      return Promise.resolve(null);
    }
    return Promise.resolve(this.statuses.get(id) ?? null);
  }

  findByDescription(description: string): Promise<CompanyStatus | null> {
    return Promise.resolve(
      [...this.statuses.values()].find(
        (status) =>
          status.description === description &&
          !this.deleted.has(status.id as CompanyStatusId),
      ) ?? null,
    );
  }

  softDelete(id: CompanyStatusId): Promise<void> {
    this.deleted.add(id);
    return Promise.resolve();
  }
}
