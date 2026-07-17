import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { CompanyStatus } from '@/companies/domain/company-status';
import { CompanyAccessDeniedError } from '@/companies/domain/company-access-denied.error';
import { CompanyStatusAlreadyExistsError } from '@/companies/domain/company-status-already-exists.error';
import { CompanyStatusNotFoundError } from '@/companies/domain/company-status-not-found.error';
import { CreateCompanyStatus } from '@/companies/application/create-company-status.use-case';
import { ListCompanyStatuses } from '@/companies/application/list-company-statuses.use-case';
import { DeleteCompanyStatus } from '@/companies/application/delete-company-status.use-case';
import { InMemoryCompanyStatusRepository } from '@/companies/infrastructure/persistence/in-memory-company-status.repository';

const feature = loadFeature('specs/company_status_management.feature', {
  errors: false,
});

const DESCRIPTION = 'Prospecto';

defineFeature(feature, (test) => {
  let statuses: InMemoryCompanyStatusRepository;
  let createCompanyStatus: CreateCompanyStatus;
  let listCompanyStatuses: ListCompanyStatuses;
  let deleteCompanyStatus: DeleteCompanyStatus;
  let actor: Actor;
  let created: CompanyStatus | null;
  let existing: CompanyStatus;
  let denied: boolean;
  let conflict: boolean;
  let notFound: boolean;
  let listed: CompanyStatus[];

  beforeEach(() => {
    statuses = new InMemoryCompanyStatusRepository();
    createCompanyStatus = new CreateCompanyStatus(statuses);
    listCompanyStatuses = new ListCompanyStatuses(statuses);
    deleteCompanyStatus = new DeleteCompanyStatus(statuses);
    created = null;
    denied = false;
    conflict = false;
    notFound = false;
    listed = [];
  });

  const seedStatus = async (description: string): Promise<CompanyStatus> => {
    const status = CompanyStatus.create({ description });
    await statuses.save(status);
    return status;
  };

  const attemptDelete = async (statusId: string) => {
    try {
      await deleteCompanyStatus.execute({ actor, statusId });
    } catch (error) {
      if (error instanceof CompanyAccessDeniedError) {
        denied = true;
      } else if (error instanceof CompanyStatusNotFoundError) {
        notFound = true;
      } else {
        throw error;
      }
    }
  };

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

  const attemptCreate = async (description: string) => {
    try {
      created = await createCompanyStatus.execute({ actor, description });
    } catch (error) {
      if (error instanceof CompanyAccessDeniedError) {
        denied = true;
      } else if (error instanceof CompanyStatusAlreadyExistsError) {
        conflict = true;
      } else {
        throw error;
      }
    }
  };

  test('A creator creates a company status', ({ given, when, then }) => {
    authenticatedAs(
      given,
      'a creator is authenticated',
      UserRole.CREATOR,
      'creator-1',
    );
    when('the creator creates a company status', () =>
      attemptCreate(DESCRIPTION),
    );
    then('the company status is created', async () => {
      expect(created).not.toBeNull();
      expect(created!.id).not.toBeNull();
      const stored = await statuses.findByDescription(DESCRIPTION);
      expect(stored).not.toBeNull();
      expect(stored!.description).toBe(DESCRIPTION);
    });
  });

  test('A user cannot create a company status', ({ given, when, then }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    when('the user attempts to create a company status', () =>
      attemptCreate(DESCRIPTION),
    );
    then('the company status is not created', () => {
      expect(denied).toBe(true);
      expect(created).toBeNull();
    });
  });

  test('Creating a duplicate company status', ({ given, and, when, then }) => {
    authenticatedAs(
      given,
      'a creator is authenticated',
      UserRole.CREATOR,
      'creator-1',
    );
    and('a company status already exists', async () => {
      await statuses.save(CompanyStatus.create({ description: DESCRIPTION }));
    });
    when('the creator creates the same company status', () =>
      attemptCreate(DESCRIPTION),
    );
    then('the creation is rejected as a conflict', () => {
      expect(conflict).toBe(true);
      expect(created).toBeNull();
    });
  });

  test('A creator lists the company statuses', ({ given, and, when, then }) => {
    authenticatedAs(
      given,
      'a creator is authenticated',
      UserRole.CREATOR,
      'creator-1',
    );
    and('two company statuses exist', async () => {
      await statuses.save(CompanyStatus.create({ description: 'Prospecto' }));
      await statuses.save(CompanyStatus.create({ description: 'Cliente' }));
    });
    when('the company statuses are listed', async () => {
      listed = await listCompanyStatuses.execute({ actor });
    });
    then('both company statuses are returned', () => {
      expect(listed).toHaveLength(2);
      expect(listed.map((s) => s.description).sort()).toEqual([
        'Cliente',
        'Prospecto',
      ]);
    });
  });

  test('A creator deletes a company status', ({ given, and, when, then }) => {
    authenticatedAs(
      given,
      'a creator is authenticated',
      UserRole.CREATOR,
      'creator-1',
    );
    and('a company status already exists', async () => {
      existing = await seedStatus(DESCRIPTION);
    });
    when('the creator deletes that company status', async () => {
      await attemptDelete(existing.id!);
    });
    then('the company status no longer appears in the catalogue', async () => {
      expect(denied).toBe(false);
      expect(await statuses.findById(existing.id!)).toBeNull();
      expect(await statuses.findAll()).toHaveLength(0);
    });
  });

  test('A user cannot delete a company status', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    and('a company status already exists', async () => {
      existing = await seedStatus(DESCRIPTION);
    });
    when('the user attempts to delete that company status', async () => {
      await attemptDelete(existing.id!);
    });
    then('deleting the company status is denied', async () => {
      expect(denied).toBe(true);
      // Denial must not be a partial delete: the status is still there.
      expect(await statuses.findById(existing.id!)).not.toBeNull();
    });
  });

  test('Deleting a company status that does not exist', ({
    given,
    when,
    then,
  }) => {
    authenticatedAs(
      given,
      'a creator is authenticated',
      UserRole.CREATOR,
      'creator-1',
    );
    when(
      'the creator deletes a company status that does not exist',
      async () => {
        await attemptDelete('999999');
      },
    );
    then('the company status is reported as not found', () => {
      expect(notFound).toBe(true);
    });
  });
});
