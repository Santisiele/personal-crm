import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { User } from '@/users/domain/user';
import { Actor } from '@/shared/domain/actor';
import { ListUsers } from '@/users/application/list-users.use-case';
import {
  AssignableUser,
  ListAssignableUsers,
} from '@/users/application/list-assignable-users.use-case';
import { ViewUser } from '@/users/application/view-user.use-case';
import { UserView } from '@/users/application/user-view';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';
import { UserNotFoundError } from '@/users/domain/user-not-found.error';
import { InMemoryUserRepository } from '@/users/infrastructure/persistence/in-memory-user.repository';

const feature = loadFeature('specs/user_directory.feature', { errors: false });

defineFeature(feature, (test) => {
  let users: InMemoryUserRepository;
  let listUsers: ListUsers;
  let listAssignableUsers: ListAssignableUsers;
  let viewUser: ViewUser;
  let actor: Actor;
  let otherUser: User;
  let listed: UserView[];
  let assignable: AssignableUser[];
  let viewed: UserView;
  let denied: boolean;
  let notFound: boolean;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    listUsers = new ListUsers(users);
    listAssignableUsers = new ListAssignableUsers(users);
    viewUser = new ViewUser(users);
    denied = false;
    notFound = false;
  });

  const persist = async (
    name: string,
    role: UserRole = UserRole.USER,
  ): Promise<User> => {
    const user = User.create({ name, role, passwordHash: 'hashed' });
    await users.save(user);
    return user;
  };

  // The acting principal is also a stored user so that "the actor themselves"
  // resolves to a real id in the repository.
  const authenticateAs = async (role: UserRole): Promise<void> => {
    const me = await persist('Acting User', role);
    actor = { id: me.id!, role };
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

  const twoUsersExist = (and: DefineStepFunction): void => {
    and('two users exist', async () => {
      await persist('Alice');
      await persist('Bob');
    });
  };

  const anotherUserExists = (and: DefineStepFunction): void => {
    and('another user exists', async () => {
      otherUser = await persist('Other User');
    });
  };

  const listingIsDenied = (then: DefineStepFunction): void => {
    then('listing is denied', () => {
      expect(denied).toBe(true);
    });
  };

  const viewingIsDenied = (then: DefineStepFunction): void => {
    then('viewing is denied', () => {
      expect(denied).toBe(true);
    });
  };

  test('An administrator lists all users', ({ given, and, when, then }) => {
    anAdministratorIsAuthenticated(given);
    twoUsersExist(and);

    when('the administrator lists the users', async () => {
      listed = await listUsers.execute({ actor });
    });

    then('every existing user is returned', () => {
      // The acting admin plus the two created users.
      expect(listed).toHaveLength(3);
    });

    and('no user view exposes a password hash', () => {
      for (const view of listed) {
        expect(Object.keys(view)).toEqual(['id', 'name', 'role']);
      }
    });
  });

  test('A plain user is forbidden from listing the users', ({
    given,
    and,
    when,
    then,
  }) => {
    aPlainUserIsAuthenticated(given);
    twoUsersExist(and);

    when('the user lists the users', async () => {
      try {
        await listUsers.execute({ actor });
      } catch (error) {
        if (error instanceof UserAccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });

    listingIsDenied(then);
  });

  test('A plain user can list the assignable users', ({
    given,
    and,
    when,
    then,
  }) => {
    aPlainUserIsAuthenticated(given);
    twoUsersExist(and);

    when('the user lists the assignable users', async () => {
      assignable = await listAssignableUsers.execute();
    });

    then('every assignable entry is returned', () => {
      // The acting user plus the two created users.
      expect(assignable).toHaveLength(3);
    });

    and('no assignable entry exposes a role or a password hash', () => {
      for (const entry of assignable) {
        expect(Object.keys(entry).sort()).toEqual(['id', 'name']);
      }
    });
  });

  test('An administrator views any user', ({ given, and, when, then }) => {
    anAdministratorIsAuthenticated(given);
    anotherUserExists(and);

    when('the administrator views that user', async () => {
      viewed = await viewUser.execute({ actor, userId: otherUser.id! });
    });

    then('the requested user is returned', () => {
      expect(viewed.id).toBe(otherUser.id);
    });

    and('the user view exposes no password hash', () => {
      expect(Object.keys(viewed)).toEqual(['id', 'name', 'role']);
    });
  });

  test('A user views their own profile', ({ given, when, then }) => {
    aPlainUserIsAuthenticated(given);

    when('the user views their own profile', async () => {
      viewed = await viewUser.execute({ actor, userId: actor.id });
    });

    then('the requested user is returned', () => {
      expect(viewed.id).toBe(actor.id);
    });
  });

  test('A user is forbidden from viewing another user', ({
    given,
    and,
    when,
    then,
  }) => {
    aPlainUserIsAuthenticated(given);
    anotherUserExists(and);

    when('the user views that other user', async () => {
      try {
        await viewUser.execute({ actor, userId: otherUser.id! });
      } catch (error) {
        if (error instanceof UserAccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });

    viewingIsDenied(then);
  });

  test('Viewing a user that does not exist is reported as not found', ({
    given,
    when,
    then,
  }) => {
    anAdministratorIsAuthenticated(given);

    when('the administrator views a user that does not exist', async () => {
      try {
        await viewUser.execute({ actor, userId: '999999' });
      } catch (error) {
        if (error instanceof UserNotFoundError) {
          notFound = true;
        } else {
          throw error;
        }
      }
    });

    then('the user is reported as not found', () => {
      expect(notFound).toBe(true);
    });
  });
});
