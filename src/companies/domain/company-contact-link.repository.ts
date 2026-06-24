import { CompanyContactLink } from '@/companies/domain/company-contact-link';

/**
 * Driven port for persisting company–contact associations. Implemented by
 * adapters (in-memory, Prisma, ...).
 */
export interface CompanyContactLinkRepository {
  save(link: CompanyContactLink): Promise<void>;
}

export const COMPANY_CONTACT_LINK_REPOSITORY = Symbol(
  'CompanyContactLinkRepository',
);
