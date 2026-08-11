import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { User } from '@/users/domain/user';
import { Actor } from '@/shared/domain/actor';
import { CreateUser } from '@/users/application/create-user.use-case';
import { DeactivateUser } from '@/users/application/deactivate-user.use-case';
import { ListUsers } from '@/users/application/list-users.use-case';
import { ViewUser } from '@/users/application/view-user.use-case';
import { UserView } from '@/users/application/user-view';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';
import { UserNotFoundError } from '@/users/domain/user-not-found.error';
import { InMemoryUserRepository } from '@/users/infrastructure/persistence/in-memory-user.repository';
import { FakePasswordHasher } from '@/users/tests/doubles/fake-password-hasher';

const feature = loadFeature('specs/user_deactivation.feature', {
  errors: false,
});

defineFeature(feature, (test) => {
  let users: InMemoryUserRepository;
  let deactivateUser: DeactivateUser;
  let createUser: CreateUser;
  let listUsers: ListUsers;
  let viewUser: ViewUser;
  let actor: Actor;
  let otherUser: User;
  let recreated: User;
  let denied: boolean;
  let notFound: boolean;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    deactivateUser = new DeactivateUser(users);
    createUser = new CreateUser(users, new FakePasswordHasher());
    listUsers = new ListUsers(users);
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

  const anotherUserExists = (and: DefineStepFunction): void => {
    and('another user exists', async () => {
      otherUser = await persist('Other User');
    });
  };

  const deactivatesThatUser = (
    when: DefineStepFunction,
    phrase: string,
  ): void => {
    when(phrase, async () => {
      try {
        await deactivateUser.execute({ actor, userId: otherUser.id! });
      } catch (error) {
        if (error instanceof UserAccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });
  };

  test('An administrator deactivates a user', ({ given, and, when, then }) => {
    anAdministratorIsAuthenticated(given);
    anotherUserExists(and);
    deactivatesThatUser(when, 'the administrator deactivates that user');

    then('the user no longer appears in the directory listing', async () => {
      const listed: UserView[] = await listUsers.execute({ actor });
      expect(listed.map((view) => view.id)).not.toContain(otherUser.id);
    });
  });

  test('A deactivated user can still be viewed by id', ({
    given,
    and,
    when,
    then,
  }) => {
    anAdministratorIsAuthenticated(given);
    anotherUserExists(and);
    deactivatesThatUser(when, 'the administrator deactivates that user');

    then('the user can still be viewed by id', async () => {
      const viewed: UserView = await viewUser.execute({
        actor,
        userId: otherUser.id!,
      });
      expect(viewed.id).toBe(otherUser.id);
    });
  });

  test('A plain user is forbidden from deactivating a user', ({
    given,
    and,
    when,
    then,
  }) => {
    aPlainUserIsAuthenticated(given);
    anotherUserExists(and);
    deactivatesThatUser(when, 'the user attempts to deactivate that user');

    then('deactivation is denied', () => {
      expect(denied).toBe(true);
    });
  });

  test('Deactivating a user that does not exist is reported as not found', ({
    given,
    when,
    then,
  }) => {
    anAdministratorIsAuthenticated(given);

    when(
      'the administrator deactivates a user that does not exist',
      async () => {
        try {
          await deactivateUser.execute({ actor, userId: '999999' });
        } catch (error) {
          if (error instanceof UserNotFoundError) {
            notFound = true;
          } else {
            throw error;
          }
        }
      },
    );

    then('the user is reported as not found', () => {
      expect(notFound).toBe(true);
    });
  });

  test('The name of a deactivated user can be reused', ({
    given,
    and,
    when,
    then,
  }) => {
    anAdministratorIsAuthenticated(given);
    anotherUserExists(and);

    when(
      'that user is deactivated and a new account takes the same name',
      async () => {
        await deactivateUser.execute({ actor, userId: otherUser.id! });
        // findByName skips the deactivated user, so the name is free again.
        recreated = await createUser.execute({
          actor,
          name: otherUser.name,
          password: 'a-new-password',
        });
      },
    );

    then('the new account is created with that name', async () => {
      expect(recreated.id).not.toBe(otherUser.id);
      const found = await users.findByName(otherUser.name);
      expect(found!.id).toBe(recreated.id);
    });
  });
});
