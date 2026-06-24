import { Company } from '@/companies/domain/company';
import { CompanyRepository } from '@/companies/domain/company.repository';

/**
 * Application service that lists every company. Reading the catalogue is open to
 * any authenticated actor, so there is no authorization check here (the global
 * JwtAuthGuard already requires a valid token).
 */
export class ListCompanies {
  constructor(private readonly companies: CompanyRepository) {}

  execute(): Promise<Company[]> {
    return this.companies.findAll();
  }
}
