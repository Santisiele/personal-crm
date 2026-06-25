import { Actor } from '@/shared/domain/actor';
import { CompanyId } from '@/companies/domain/company';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CompanyAccessPolicy } from '@/companies/domain/company-access-policy';
import { CompanyNotFoundError } from '@/companies/domain/company-not-found.error';
import { CompanyRepository } from '@/companies/domain/company.repository';

export interface DeleteCompanyCommand {
  actor: Actor;
  companyId: CompanyId;
}

/**
 * Application service for deleting a company (logical delete). Only privileged
 * actors may manage companies (delegated to CompanyAccessPolicy); the company
 * must exist. The company is soft-deleted, so it disappears from listings but
 * remains retrievable by id for historical references.
 */
export class DeleteCompany {
  private readonly policy = new CompanyAccessPolicy();

  constructor(private readonly companies: CompanyRepository) {}

  async execute(command: DeleteCompanyCommand): Promise<void> {
    const company = await this.companies.findById(command.companyId);
    if (!company) {
      throw new CompanyNotFoundError(command.companyId);
    }
    if (!this.policy.canDelete(command.actor)) {
      throw new CompanyAccessDeniedError();
    }
    await this.companies.softDelete(command.companyId, command.actor.id);
  }
}
