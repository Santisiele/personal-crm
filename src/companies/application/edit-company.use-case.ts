import { Actor } from '@/shared/domain/actor';
import { Company, CompanyId } from '@/companies/domain/company';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CompanyAccessPolicy } from '@/companies/domain/company-access-policy';
import { CompanyNotFoundError } from '@/companies/domain/company-not-found.error';
import { CompanyRepository } from '@/companies/domain/company.repository';

export interface EditCompanyCommand {
  actor: Actor;
  companyId: CompanyId;
  companyName?: string;
  cuit?: string | null;
  brand?: string | null;
  product?: string | null;
  origin?: string | null;
}

/**
 * Application service for editing a company's fields. Only privileged actors may
 * manage companies (delegated to CompanyAccessPolicy); the company must exist.
 * Only the attributes present in the command are changed.
 */
export class EditCompany {
  private readonly policy = new CompanyAccessPolicy();

  constructor(private readonly companies: CompanyRepository) {}

  async execute(command: EditCompanyCommand): Promise<Company> {
    if (!this.policy.canEdit(command.actor)) {
      throw new CompanyAccessDeniedError();
    }

    const company = await this.companies.findById(command.companyId);
    if (!company) {
      throw new CompanyNotFoundError(command.companyId);
    }

    company.update({
      companyName: command.companyName,
      cuit: command.cuit,
      brand: command.brand,
      product: command.product,
      origin: command.origin,
    });
    await this.companies.save(company);
    return company;
  }
}
