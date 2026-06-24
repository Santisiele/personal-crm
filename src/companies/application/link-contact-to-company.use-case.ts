import { Actor } from '@/shared/domain/actor';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CompanyAccessPolicy } from '@/companies/domain/company-access-policy';
import { CompanyContactLink } from '@/companies/domain/company-contact-link';
import { CompanyContactLinkRepository } from '@/companies/domain/company-contact-link.repository';
import { CompanyNotFoundError } from '@/companies/domain/company-not-found.error';
import { CompanyRepository } from '@/companies/domain/company.repository';
import { ContactNotFoundError } from '@/contacts/domain/contact-not-found.error';
import { ContactRepository } from '@/contacts/domain/contact.repository';

export interface LinkContactToCompanyCommand {
  actor: Actor;
  companyId: string;
  contactId: string;
  roleInCompany?: string | null;
  phone?: string | null;
}

/**
 * Application service for associating an existing contact with an existing
 * company. Only privileged actors may manage companies (delegated to
 * CompanyAccessPolicy); both ends of the association must exist.
 */
export class LinkContactToCompany {
  private readonly policy = new CompanyAccessPolicy();

  constructor(
    private readonly companies: CompanyRepository,
    private readonly contacts: ContactRepository,
    private readonly links: CompanyContactLinkRepository,
  ) {}

  async execute(
    command: LinkContactToCompanyCommand,
  ): Promise<CompanyContactLink> {
    if (!this.policy.canLinkContacts(command.actor)) {
      throw new CompanyAccessDeniedError();
    }

    const company = await this.companies.findById(command.companyId);
    if (!company) {
      throw new CompanyNotFoundError(command.companyId);
    }
    const contact = await this.contacts.findById(command.contactId);
    if (!contact) {
      throw new ContactNotFoundError(command.contactId);
    }

    const link = CompanyContactLink.create({
      companyId: command.companyId,
      contactId: command.contactId,
      roleInCompany: command.roleInCompany,
      phone: command.phone,
    });
    await this.links.save(link);
    return link;
  }
}
