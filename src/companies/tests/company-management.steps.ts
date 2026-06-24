import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Company } from '@/companies/domain/company';
import { CompanyContactLink } from '@/companies/domain/company-contact-link';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CreateCompany } from '@/companies/application/create-company.use-case';
import { LinkContactToCompany } from '@/companies/application/link-contact-to-company.use-case';
import { InMemoryCompanyRepository } from '@/companies/infrastructure/persistence/in-memory-company.repository';
import { InMemoryCompanyContactLinkRepository } from '@/companies/infrastructure/persistence/in-memory-company-contact-link.repository';
import { Contact } from '@/contacts/domain/contact';
import { InMemoryContactRepository } from '@/contacts/infrastructure/persistence/in-memory-contact.repository';

const feature = loadFeature('specs/company_management.feature', {
  errors: false,
});

const COMPANY_NAME = 'Acme Corp';

defineFeature(feature, (test) => {
  let companies: InMemoryCompanyRepository;
  let contacts: InMemoryContactRepository;
  let links: InMemoryCompanyContactLinkRepository;
  let createCompany: CreateCompany;
  let linkContactToCompany: LinkContactToCompany;
  let actor: Actor;
  let created: Company | null;
  let linked: CompanyContactLink | null;
  let companyId: string;
  let contactId: string;
  let denied: boolean;

  beforeEach(() => {
    companies = new InMemoryCompanyRepository();
    contacts = new InMemoryContactRepository();
    links = new InMemoryCompanyContactLinkRepository();
    createCompany = new CreateCompany(companies);
    linkContactToCompany = new LinkContactToCompany(companies, contacts, links);
    created = null;
    linked = null;
    denied = false;
  });

  const authenticatedAs = (
    given: DefineStepFunction,
    phrase: string,
    role: UserRole,
    id: string,
  ) => {
    given(phrase, () => {
      actor = { id, role };
    });
  };

  const attemptCreate = async () => {
    try {
      created = await createCompany.execute({
        actor,
        companyName: COMPANY_NAME,
      });
    } catch (error) {
      if (error instanceof CompanyAccessDeniedError) {
        denied = true;
      } else {
        throw error;
      }
    }
  };

  const createsACompany = (when: DefineStepFunction, phrase: string) => {
    when(phrase, () => attemptCreate());
  };

  const theCompanyIsCreated = (then: DefineStepFunction) => {
    then('the company is created', async () => {
      expect(created).not.toBeNull();
      expect(created!.id).not.toBeNull();
      const stored = await companies.findById(created!.id as string);
      expect(stored).not.toBeNull();
    });
  };

  const theCompanyIsNotCreated = (then: DefineStepFunction) => {
    then('the company is not created', () => {
      expect(denied).toBe(true);
      expect(created).toBeNull();
    });
  };

  const aCompanyAndAContactExist = (and: DefineStepFunction) => {
    and('a company and a contact exist', async () => {
      const company = Company.create({
        ownerId: 'owner-admin',
        companyName: COMPANY_NAME,
      });
      await companies.save(company);
      companyId = company.id as string;

      const contact = Contact.create({ contactName: 'Jane Roe' });
      await contacts.save(contact);
      contactId = contact.id as string;
    });
  };

  const linksTheContact = (when: DefineStepFunction) => {
    when('the contact is linked to the company', async () => {
      try {
        linked = await linkContactToCompany.execute({
          actor,
          companyId,
          contactId,
          roleInCompany: 'CEO',
          phone: '555-0100',
        });
      } catch (error) {
        if (error instanceof CompanyAccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });
  };

  test('An administrator creates a company', ({ given, when, then, and }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    createsACompany(when, 'the administrator creates a company');
    theCompanyIsCreated(then);
    and('the company belongs to the administrator', () => {
      expect(created!.ownerId).toBe(actor.id);
    });
  });

  test('A user cannot create a company', ({ given, when, then }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    createsACompany(when, 'the user attempts to create a company');
    theCompanyIsNotCreated(then);
  });

  test('An administrator links a contact to a company', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    aCompanyAndAContactExist(and);
    linksTheContact(when);
    then('the contact and the company are associated', () => {
      expect(linked).not.toBeNull();
      expect(linked!.id).not.toBeNull();
      expect(linked!.companyId).toBe(companyId);
      expect(linked!.contactId).toBe(contactId);
    });
  });

  test('A user cannot link a contact to a company', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    aCompanyAndAContactExist(and);
    linksTheContact(when);
    then('the link is denied', () => {
      expect(denied).toBe(true);
      expect(linked).toBeNull();
    });
  });
});
