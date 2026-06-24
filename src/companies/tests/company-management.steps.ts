import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Company } from '@/companies/domain/company';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CreateCompany } from '@/companies/application/create-company.use-case';
import { InMemoryCompanyRepository } from '@/companies/infrastructure/persistence/in-memory-company.repository';

const feature = loadFeature('specs/company_management.feature', {
  errors: false,
});

const COMPANY_NAME = 'Acme Corp';

defineFeature(feature, (test) => {
  let companies: InMemoryCompanyRepository;
  let createCompany: CreateCompany;
  let actor: Actor;
  let created: Company | null;
  let denied: boolean;

  beforeEach(() => {
    companies = new InMemoryCompanyRepository();
    createCompany = new CreateCompany(companies);
    created = null;
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
});
