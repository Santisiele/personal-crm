import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Company } from '@/companies/domain/company';
import { CompanyContactLink } from '@/companies/domain/company-contact-link';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CreateCompany } from '@/companies/application/create-company.use-case';
import { LinkContactToCompany } from '@/companies/application/link-contact-to-company.use-case';
import { ListCompanies } from '@/companies/application/list-companies.use-case';
import {
  CompanyWithContacts,
  ViewCompany,
} from '@/companies/application/view-company.use-case';
import { EditCompany } from '@/companies/application/edit-company.use-case';
import { ChangeCompanyStatus } from '@/companies/application/change-company-status.use-case';
import { DeleteCompany } from '@/companies/application/delete-company.use-case';
import { CompanyNotFoundError } from '@/companies/domain/company-not-found.error';
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
  let listCompanies: ListCompanies;
  let viewCompany: ViewCompany;
  let editCompany: EditCompany;
  let changeCompanyStatus: ChangeCompanyStatus;
  let deleteCompany: DeleteCompany;
  let actor: Actor;
  let created: Company | null;
  let linked: CompanyContactLink | null;
  let companyId: string;
  let contactId: string;
  let denied: boolean;
  let listed: Company[];
  let viewed: CompanyWithContacts | null;
  let notFound: boolean;
  let edited: Company | null;
  let restatused: Company | null;

  beforeEach(() => {
    companies = new InMemoryCompanyRepository();
    contacts = new InMemoryContactRepository();
    links = new InMemoryCompanyContactLinkRepository();
    createCompany = new CreateCompany(companies);
    linkContactToCompany = new LinkContactToCompany(companies, contacts, links);
    listCompanies = new ListCompanies(companies);
    viewCompany = new ViewCompany(companies, links, contacts);
    editCompany = new EditCompany(companies);
    changeCompanyStatus = new ChangeCompanyStatus(companies);
    deleteCompany = new DeleteCompany(companies);
    created = null;
    linked = null;
    denied = false;
    listed = [];
    viewed = null;
    notFound = false;
    edited = null;
    restatused = null;
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

  const aCompanyExists = (and: DefineStepFunction) => {
    and('a company exists', async () => {
      const company = Company.create({
        ownerId: 'owner-admin',
        companyName: COMPANY_NAME,
      });
      await companies.save(company);
      companyId = company.id as string;
    });
  };

  test('Listing the companies', ({ given, and, when, then }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    and('two companies exist', async () => {
      await companies.save(
        Company.create({ ownerId: 'admin-1', companyName: 'First Co' }),
      );
      await companies.save(
        Company.create({ ownerId: 'admin-1', companyName: 'Second Co' }),
      );
    });
    when('the companies are listed', async () => {
      listed = await listCompanies.execute();
    });
    then('both companies are returned', () => {
      expect(listed).toHaveLength(2);
      expect(listed.map((c) => c.companyName).sort()).toEqual([
        'First Co',
        'Second Co',
      ]);
    });
  });

  test('Viewing a company with its linked contacts', ({
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
    and('a company with a linked contact exists', async () => {
      const company = Company.create({
        ownerId: 'admin-1',
        companyName: COMPANY_NAME,
      });
      await companies.save(company);
      companyId = company.id as string;

      const contact = Contact.create({ contactName: 'Jane Roe' });
      await contacts.save(contact);
      contactId = contact.id as string;

      linked = await linkContactToCompany.execute({
        actor: { id: 'admin-1', role: UserRole.ADMIN },
        companyId,
        contactId,
        roleInCompany: 'CEO',
        phone: '555-0100',
      });
    });
    when('the company is viewed', async () => {
      viewed = await viewCompany.execute({ companyId });
    });
    then('the company is returned with its linked contact', () => {
      expect(viewed).not.toBeNull();
      expect(viewed!.company.id).toBe(companyId);
      expect(viewed!.contacts).toHaveLength(1);
      expect(viewed!.contacts[0].contact.id).toBe(contactId);
      expect(viewed!.contacts[0].roleInCompany).toBe('CEO');
      expect(viewed!.contacts[0].phone).toBe('555-0100');
    });
  });

  test('Viewing a company that does not exist', ({ given, when, then }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    when('a non-existent company is viewed', async () => {
      try {
        viewed = await viewCompany.execute({ companyId: '99999' });
      } catch (error) {
        if (error instanceof CompanyNotFoundError) {
          notFound = true;
        } else {
          throw error;
        }
      }
    });
    then('the company is reported as not found', () => {
      expect(notFound).toBe(true);
      expect(viewed).toBeNull();
    });
  });

  test('An administrator edits a company', ({ given, and, when, then }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    aCompanyExists(and);
    when('the administrator edits the company name', async () => {
      edited = await editCompany.execute({
        actor,
        companyId,
        companyName: 'Renamed Co',
      });
    });
    then('the company reflects the new name', async () => {
      expect(edited!.companyName).toBe('Renamed Co');
      const stored = await companies.findById(companyId);
      expect(stored!.companyName).toBe('Renamed Co');
    });
  });

  test('A user cannot edit a company', ({ given, and, when, then }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    aCompanyExists(and);
    when('the user attempts to edit the company name', async () => {
      try {
        edited = await editCompany.execute({
          actor,
          companyId,
          companyName: 'Renamed Co',
        });
      } catch (error) {
        if (error instanceof CompanyAccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });
    then('the edit is denied', () => {
      expect(denied).toBe(true);
      expect(edited).toBeNull();
    });
  });

  test('An administrator changes a company status', ({
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
    aCompanyExists(and);
    when('the administrator changes the company status', async () => {
      restatused = await changeCompanyStatus.execute({
        actor,
        companyId,
        status: 'INACTIVE',
      });
    });
    then('the company reflects the new status', async () => {
      expect(restatused!.status).toBe('INACTIVE');
      const stored = await companies.findById(companyId);
      expect(stored!.status).toBe('INACTIVE');
    });
  });

  test('A user cannot change a company status', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    aCompanyExists(and);
    when('the user attempts to change the company status', async () => {
      try {
        restatused = await changeCompanyStatus.execute({
          actor,
          companyId,
          status: 'INACTIVE',
        });
      } catch (error) {
        if (error instanceof CompanyAccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });
    then('the status change is denied', () => {
      expect(denied).toBe(true);
      expect(restatused).toBeNull();
    });
  });

  const deletesTheCompany = (when: DefineStepFunction, phrase: string) => {
    when(phrase, async () => {
      try {
        await deleteCompany.execute({ actor, companyId });
      } catch (error) {
        if (error instanceof CompanyAccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });
  };

  test('An administrator deletes a company', ({ given, and, when, then }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    aCompanyExists(and);
    deletesTheCompany(when, 'the administrator deletes the company');
    then('the company no longer appears in the listing', async () => {
      listed = await listCompanies.execute();
      expect(listed.some((c) => c.id === companyId)).toBe(false);
    });
  });

  test('A deleted company can still be viewed by id', ({
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
    aCompanyExists(and);
    deletesTheCompany(when, 'the administrator deletes the company');
    then('the company can still be viewed by id', async () => {
      viewed = await viewCompany.execute({ companyId });
      expect(viewed).not.toBeNull();
      expect(viewed.company.id).toBe(companyId);
    });
  });

  test('A user cannot delete a company', ({ given, and, when, then }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    aCompanyExists(and);
    deletesTheCompany(when, 'the user attempts to delete the company');
    then('the deletion is denied', async () => {
      expect(denied).toBe(true);
      listed = await listCompanies.execute();
      expect(listed.some((c) => c.id === companyId)).toBe(true);
    });
  });

  test('Deleting a company that does not exist', ({ given, when, then }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    when('a non-existent company is deleted', async () => {
      try {
        await deleteCompany.execute({ actor, companyId: '99999' });
      } catch (error) {
        if (error instanceof CompanyNotFoundError) {
          notFound = true;
        } else {
          throw error;
        }
      }
    });
    then('the company is reported as not found', () => {
      expect(notFound).toBe(true);
    });
  });
});
