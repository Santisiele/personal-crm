import { CompanyContactLink } from '@/companies/domain/company-contact-link';
import { CompanyContactLinkRepository } from '@/companies/domain/company-contact-link.repository';

/**
 * In-memory driven adapter for company–contact links. Owns identity for new
 * links via a simple counter, mirroring the database's autoincrement behaviour.
 */
export class InMemoryCompanyContactLinkRepository implements CompanyContactLinkRepository {
  private readonly links: CompanyContactLink[] = [];
  private sequence = 0;

  save(link: CompanyContactLink): Promise<void> {
    if (link.id === null) {
      this.sequence += 1;
      link.assignId(String(this.sequence));
    }
    this.links.push(link);
    return Promise.resolve();
  }
}
