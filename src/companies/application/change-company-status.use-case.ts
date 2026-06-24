import { Actor } from '@/shared/domain/actor';
import { Company, CompanyId, CompanyStatus } from '@/companies/domain/company';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CompanyAccessPolicy } from '@/companies/domain/company-access-policy';
import { CompanyNotFoundError } from '@/companies/domain/company-not-found.error';
import { CompanyRepository } from '@/companies/domain/company.repository';

export interface ChangeCompanyStatusCommand {
  actor: Actor;
  companyId: CompanyId;
  status: CompanyStatus;
}

/**
 * Application service for transitioning a company's lifecycle status. Only
 * privileged actors may manage companies (delegated to CompanyAccessPolicy); the
 * company must exist. The target status is a `company_status` description that
 * the persistence adapter resolves to its id.
 */
export class ChangeCompanyStatus {
  private readonly policy = new CompanyAccessPolicy();

  constructor(private readonly companies: CompanyRepository) {}

  async execute(command: ChangeCompanyStatusCommand): Promise<Company> {
    if (!this.policy.canChangeStatus(command.actor)) {
      throw new CompanyAccessDeniedError();
    }

    const company = await this.companies.findById(command.companyId);
    if (!company) {
      throw new CompanyNotFoundError(command.companyId);
    }

    company.changeStatus(command.status);
    await this.companies.save(company);
    return company;
  }
}
