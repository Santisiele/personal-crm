import { Actor } from '@/shared/domain/actor';
import { CompanyStatus } from '@/companies/domain/company-status';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CompanyAccessPolicy } from '@/companies/domain/company-access-policy';
import { CompanyStatusRepository } from '@/companies/domain/company-status.repository';

export interface ListCompanyStatusesQuery {
  actor: Actor;
}

/**
 * Application service that lists every company status. Reading the catalogue
 * through this admin surface is restricted to CREATORs (delegated to the
 * CompanyAccessPolicy).
 */
export class ListCompanyStatuses {
  private readonly policy = new CompanyAccessPolicy();

  constructor(private readonly statuses: CompanyStatusRepository) {}

  execute(query: ListCompanyStatusesQuery): Promise<CompanyStatus[]> {
    if (!this.policy.canManageStatuses(query.actor)) {
      throw new CompanyAccessDeniedError();
    }

    return this.statuses.findAll();
  }
}
