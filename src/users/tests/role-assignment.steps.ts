import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { User } from '@/users/domain/user';
import { Actor } from '@/shared/domain/actor';
import { ChangeUserRole } from '@/users/application/change-user-role.use-case';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';
import { UserNotFoundError } from '@/users/domain/user-not-found.error';
import { InMemoryUserRepository } from '@/users/infrastructure/persistence/in-memory-user.repository';

const feature = loadFeature('specs/role_assignment.feature', { errors: false });

defineFeature(feature, (test) => {
  let users: InMemoryUserRepository;
  let changeUserRole: ChangeUserRole;
  let actor: Actor;
  let target: User;
  // Captured by value: the in-memory repository hands back the very same User
  // instance, so reading target.role after the fact would mirror any mutation
  // and make the "role is untouched" assertion vacuous.
  let originalRole: UserRole;
  let denied: boolean;
  let notFound: boolean;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    changeUserRole = new ChangeUserRole(users);
    denied = false;
    notFound = false;
  });

  const persist = async (name: string, role: UserRole): Promise<User> => {
    const user = User.create({ name, role, passwordHash: 'hashed' });
    await users.save(user);
    return user;
  };

  const targetIs = (user: User): void => {
    target = user;
    originalRole = user.role;
  };

  // The acting principal is also a stored user so that assigning a role to
  // oneself resolves to a real id in the repository.
  const authenticateAs = async (role: UserRole): Promise<void> => {
    const me = await persist('Acting User', role);
    actor = { id: me.id!, role };
  };

  const assignRole = async (userId: string, role: UserRole): Promise<void> => {
    try {
      await changeUserRole.execute({ actor, userId, role });
    } catch (error) {
      if (error instanceof UserAccessDeniedError) {
        denied = true;
      } else if (error instanceof UserNotFoundError) {
        notFound = true;
      } else {
        throw error;
      }
    }
  };

  const aCreatorIsAuthenticated = (given: DefineStepFunction): void => {
    given('a creator is authenticated', async () => {
      await authenticateAs(UserRole.CREATOR);
    });
  };

  const anAdministratorIsAuthenticated = (given: DefineStepFunction): void => {
    given('an administrator is authenticated', async () => {
      await authenticateAs(UserRole.ADMIN);
    });
  };

  const aPlainUserIsAuthenticated = (given: DefineStepFunction): void => {
    given('a plain user is authenticated', async () => {
      await authenticateAs(UserRole.USER);
    });
  };

  const aPlainUserExists = (and: DefineStepFunction): void => {
    and('a plain user exists', async () => {
      targetIs(await persist('Target User', UserRole.USER));
    });
  };

  const theRoleAssignmentIsDenied = (then: DefineStepFunction): void => {
    then('the role assignment is denied', async () => {
      expect(denied).toBe(true);
      // The stored role is untouched: denial must not be a partial write.
      const stored = await users.findById(target.id!);
      expect(stored!.role).toBe(originalRole);
    });
  };

  test('The creator promotes a user to administrator', ({
    given,
    and,
    when,
    then,
  }) => {
    aCreatorIsAuthenticated(given);
    aPlainUserExists(and);

    when('the creator assigns the ADMIN role to that user', async () => {
      await assignRole(target.id!, UserRole.ADMIN);
    });

    then('the role is assigned', async () => {
      const stored = await users.findById(target.id!);
      expect(stored!.role).toBe(UserRole.ADMIN);
    });
  });

  test('The creator promotes a user to creator', ({
    given,
    and,
    when,
    then,
  }) => {
    aCreatorIsAuthenticated(given);
    aPlainUserExists(and);

    when('the creator assigns the CREATOR role to that user', async () => {
      await assignRole(target.id!, UserRole.CREATOR);
    });

    then('the role is assigned', async () => {
      const stored = await users.findById(target.id!);
      expect(stored!.role).toBe(UserRole.CREATOR);
    });
  });

  test('The creator demotes an administrator to plain user', ({
    given,
    and,
    when,
    then,
  }) => {
    aCreatorIsAuthenticated(given);

    and('an administrator exists', async () => {
      targetIs(await persist('Target Admin', UserRole.ADMIN));
    });

    when(
      'the creator assigns the USER role to that administrator',
      async () => {
        await assignRole(target.id!, UserRole.USER);
      },
    );

    then('the role is assigned', async () => {
      const stored = await users.findById(target.id!);
      expect(stored!.role).toBe(UserRole.USER);
    });
  });

  test('An administrator promotes a user to administrator', ({
    given,
    and,
    when,
    then,
  }) => {
    anAdministratorIsAuthenticated(given);
    aPlainUserExists(and);

    when('the administrator assigns the ADMIN role to that user', async () => {
      await assignRole(target.id!, UserRole.ADMIN);
    });

    then('the role is assigned', async () => {
      const stored = await users.findById(target.id!);
      expect(stored!.role).toBe(UserRole.ADMIN);
    });
  });

  test('An administrator demotes an administrator to plain user', ({
    given,
    and,
    when,
    then,
  }) => {
    anAdministratorIsAuthenticated(given);

    and('another administrator exists', async () => {
      targetIs(await persist('Other Admin', UserRole.ADMIN));
    });

    when(
      'the administrator assigns the USER role to that administrator',
      async () => {
        await assignRole(target.id!, UserRole.USER);
      },
    );

    then('the role is assigned', async () => {
      const stored = await users.findById(target.id!);
      expect(stored!.role).toBe(UserRole.USER);
    });
  });

  test('A plain user cannot promote themselves', ({ given, when, then }) => {
    aPlainUserIsAuthenticated(given);

    when('the user assigns the CREATOR role to themselves', async () => {
      // The actor is their own target: this is the privilege-escalation path.
      targetIs((await users.findById(actor.id))!);
      await assignRole(actor.id, UserRole.CREATOR);
    });

    theRoleAssignmentIsDenied(then);
  });

  test('An administrator cannot grant the creator role', ({
    given,
    and,
    when,
    then,
  }) => {
    anAdministratorIsAuthenticated(given);
    aPlainUserExists(and);

    when(
      'the administrator assigns the CREATOR role to that user',
      async () => {
        await assignRole(target.id!, UserRole.CREATOR);
      },
    );

    theRoleAssignmentIsDenied(then);
  });

  test('An administrator cannot demote the creator', ({
    given,
    and,
    when,
    then,
  }) => {
    anAdministratorIsAuthenticated(given);

    and('a creator exists', async () => {
      targetIs(await persist('Target Creator', UserRole.CREATOR));
    });

    when(
      'the administrator assigns the USER role to that creator',
      async () => {
        await assignRole(target.id!, UserRole.USER);
      },
    );

    theRoleAssignmentIsDenied(then);
  });

  test('Assigning a role to a user that does not exist is reported as not found', ({
    given,
    when,
    then,
  }) => {
    aCreatorIsAuthenticated(given);

    when(
      'the creator assigns the ADMIN role to a user that does not exist',
      async () => {
        await assignRole('999999', UserRole.ADMIN);
      },
    );

    then('the user is reported as not found', () => {
      expect(notFound).toBe(true);
    });
  });
});
