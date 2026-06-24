import { CompanyContactLink } from '@/companies/domain/company-contact-link';

/**
 * Driven port for persisting company–contact associations. Implemented by
 * adapters (in-memory, Prisma, ...).
 */
export interface CompanyContactLinkRepository {
  save(link: CompanyContactLink): Promise<void>;
  findByCompanyId(companyId: string): Promise<CompanyContactLink[]>;
}

export const COMPANY_CONTACT_LINK_REPOSITORY = Symbol(
  'CompanyContactLinkRepository',
);
