import { Actor } from '@/shared/domain/actor';
import { Company } from '@/companies/domain/company';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CompanyAccessPolicy } from '@/companies/domain/company-access-policy';
import { CompanyRepository } from '@/companies/domain/company.repository';

export interface CreateCompanyCommand {
  actor: Actor;
  companyName: string;
  cuit?: string | null;
  brand?: string | null;
  product?: string | null;
  origin?: string | null;
}

/**
 * Application service for creating a company. The creator always owns the
 * company; the authorization decision (only privileged actors may create) is
 * delegated to the CompanyAccessPolicy domain service.
 */
export class CreateCompany {
  private readonly policy = new CompanyAccessPolicy();

  constructor(private readonly companies: CompanyRepository) {}

  async execute(command: CreateCompanyCommand): Promise<Company> {
    if (!this.policy.canCreate(command.actor)) {
      throw new CompanyAccessDeniedError();
    }

    const company = Company.create({
      ownerId: command.actor.id,
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
