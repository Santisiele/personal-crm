import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Role } from '@/users/domain/role';
import { CreateRole } from '@/users/application/create-role.use-case';
import { ListRoles } from '@/users/application/list-roles.use-case';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';
import { RoleAlreadyExistsError } from '@/users/domain/role-already-exists.error';
import { InMemoryRoleRepository } from '@/users/infrastructure/persistence/in-memory-role.repository';

const feature = loadFeature('specs/role_management.feature', { errors: false });

defineFeature(feature, (test) => {
  let roles: InMemoryRoleRepository;
  let createRole: CreateRole;
  let listRoles: ListRoles;
  let actor: Actor;
  let created: Role | null;
  let listed: Role[];
  let denied: boolean;
  let alreadyExists: boolean;

  beforeEach(() => {
    roles = new InMemoryRoleRepository();
    createRole = new CreateRole(roles);
    listRoles = new ListRoles(roles);
    created = null;
    listed = [];
    denied = false;
    alreadyExists = false;
  });

  const authenticatedAs = (
    given: DefineStepFunction,
    phrase: string,
    role: UserRole,
  ): void => {
    given(phrase, () => {
      actor = { id: '1', role };
    });
  };

  const aCreatorIsAuthenticated = (given: DefineStepFunction): void => {
    authenticatedAs(given, 'a creator is authenticated', UserRole.CREATOR);
  };

  const anAdministratorIsAuthenticated = (given: DefineStepFunction): void => {
    authenticatedAs(given, 'an administrator is authenticated', UserRole.ADMIN);
  };

  const attemptCreate = async (description: string): Promise<void> => {
    try {
      created = await createRole.execute({ actor, description });
    } catch (error) {
      if (error instanceof UserAccessDeniedError) {
        denied = true;
      } else if (error instanceof RoleAlreadyExistsError) {
        alreadyExists = true;
      } else {
        throw error;
      }
    }
  };

  test('A creator creates a role', ({ given, when, then }) => {
    aCreatorIsAuthenticated(given);

    when(/^the creator creates a role "(.*)"$/, async (description) => {
      await attemptCreate(description);
    });

    then(/^the role "(.*)" is stored$/, async (description) => {
      expect(created).not.toBeNull();
      expect(created!.id).not.toBeNull();
      expect(created!.description).toBe(description);
      expect(await roles.findByDescription(description)).not.toBeNull();
    });
  });

  test('A non-creator cannot create a role', ({ given, when, then }) => {
    anAdministratorIsAuthenticated(given);

    when(
      /^the administrator attempts to create a role "(.*)"$/,
      async (description) => {
        await attemptCreate(description);
      },
    );

    then('the role creation is denied', () => {
      expect(denied).toBe(true);
      expect(created).toBeNull();
    });
  });

  test('Creating a duplicate role is rejected', ({
    given,
    and,
    when,
    then,
  }) => {
    aCreatorIsAuthenticated(given);

    and(/^a role "(.*)" already exists$/, async (description: string) => {
      await createRole.execute({ actor, description });
    });

    when(
      /^the creator attempts to create a role "(.*)"$/,
      async (description) => {
        await attemptCreate(description);
      },
    );

    then('the role already exists', () => {
      expect(alreadyExists).toBe(true);
    });
  });

  test('A creator lists the roles', ({ given, and, when, then }) => {
    aCreatorIsAuthenticated(given);

    and(
      /^the roles "(.*)" and "(.*)" exist$/,
      async (first: string, second: string) => {
        await createRole.execute({ actor, description: first });
        await createRole.execute({ actor, description: second });
      },
    );

    when('the creator lists the roles', async () => {
      listed = await listRoles.execute({ actor });
    });

    then('both roles are returned', () => {
      const descriptions = listed.map((role) => role.description);
      expect(descriptions).toEqual(
        expect.arrayContaining(['MANAGER', 'ANALYST']),
      );
      expect(listed).toHaveLength(2);
    });
  });
});
