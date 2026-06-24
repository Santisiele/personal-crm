import { Company, CompanyId } from '@/companies/domain/company';
import { CompanyContactLinkRepository } from '@/companies/domain/company-contact-link.repository';
import { CompanyNotFoundError } from '@/companies/domain/company-not-found.error';
import { CompanyRepository } from '@/companies/domain/company.repository';
import { Contact } from '@/contacts/domain/contact';
import { ContactRepository } from '@/contacts/domain/contact.repository';

export interface ViewCompanyQuery {
  companyId: CompanyId;
}

/**
 * A contact as seen through a company: the contact aggregate enriched with the
 * association's own attributes (its role in the company and the contact phone).
 */
export interface LinkedContact {
  contact: Contact;
  roleInCompany: string | null;
  phone: string | null;
}

/** A company together with the contacts linked to it. */
export interface CompanyWithContacts {
  company: Company;
  contacts: LinkedContact[];
}

/**
 * Application service for reading a single company together with its linked
 * contacts. It hydrates each `contact_x_company` association into the contact it
 * points at (resolved via the ContactRepository). Missing contacts are skipped
 * defensively. Reading is open to any authenticated actor.
 */
export class ViewCompany {
  constructor(
    private readonly companies: CompanyRepository,
    private readonly links: CompanyContactLinkRepository,
    private readonly contacts: ContactRepository,
  ) {}

  async execute(query: ViewCompanyQuery): Promise<CompanyWithContacts> {
    const company = await this.companies.findById(query.companyId);
    if (!company) {
      throw new CompanyNotFoundError(query.companyId);
    }

    const links = await this.links.findByCompanyId(query.companyId);
    const linkedContacts: LinkedContact[] = [];
    for (const link of links) {
      const contact = await this.contacts.findById(link.contactId);
      if (!contact) {
        continue;
      }
      linkedContacts.push({
        contact,
        roleInCompany: link.roleInCompany,
        phone: link.phone,
      });
    }

    return { company, contacts: linkedContacts };
  }
}
