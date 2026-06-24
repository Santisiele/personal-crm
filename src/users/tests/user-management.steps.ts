import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { User } from '@/users/domain/user';
import { CreateUser } from '@/users/application/create-user.use-case';
import { ChangePassword } from '@/users/application/change-password.use-case';
import { ChangeUserRole } from '@/users/application/change-user-role.use-case';
import { InMemoryUserRepository } from '@/users/infrastructure/persistence/in-memory-user.repository';
import { FakePasswordHasher } from '@/users/tests/doubles/fake-password-hasher';
import { UserNameTakenError } from '@/users/domain/user-name-taken.error';

const feature = loadFeature('specs/user_managment.feature', { errors: false });

defineFeature(feature, (test) => {
  let users: InMemoryUserRepository;
  let hasher: FakePasswordHasher;
  let createUser: CreateUser;
  let changePassword: ChangePassword;
  let changeUserRole: ChangeUserRole;
  let createdUser: User;
  let oldPassword: string;
  let conflictRejected: boolean;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    createUser = new CreateUser(users, hasher);
    changePassword = new ChangePassword(users, hasher);
    changeUserRole = new ChangeUserRole(users);
    conflictRejected = false;
  });

  const anAdministratorIsAuthenticated = (given: DefineStepFunction) => {
    given('an administrator is authenticated', () => {
      // No authorization rule is exercised by these scenarios yet (there is no
      // rejection scenario), so the authenticated admin is just the acting
      // context. Enforcement will be introduced when a scenario demands it.
    });
  };

  const createsAUserWithRole = (when: DefineStepFunction) => {
    when(/^creates a user with role (.*)$/, async (role: string) => {
      createdUser = await createUser.execute({
        name: 'Jane Doe',
        role: UserRole[role as keyof typeof UserRole],
        password: 'initial-password',
      });
    });
  };

  const theUserShouldBeStored = (then: DefineStepFunction) => {
    then('the user should be stored', async () => {
      const stored = await users.findById(createdUser.id!);
      expect(stored).not.toBeNull();
    });
  };

  const theUserRoleShouldBe = (and: DefineStepFunction) => {
    and(/^the user role should be (.*)$/, (role: string) => {
      expect(createdUser.role).toBe(UserRole[role as keyof typeof UserRole]);
    });
  };

  test('Create a normal user', ({ given, when, then, and }) => {
    anAdministratorIsAuthenticated(given);
    createsAUserWithRole(when);
    theUserShouldBeStored(then);
    theUserRoleShouldBe(and);
  });

  test('Create an administrator user', ({ given, when, then, and }) => {
    anAdministratorIsAuthenticated(given);
    createsAUserWithRole(when);
    theUserShouldBeStored(then);
    theUserRoleShouldBe(and);
  });

  test('Create a creator user', ({ given, when, then, and }) => {
    anAdministratorIsAuthenticated(given);
    createsAUserWithRole(when);
    theUserShouldBeStored(then);
    theUserRoleShouldBe(and);
  });

  test('Change own password', ({ given, when, then, and }) => {
    given('a user is authenticated', async () => {
      oldPassword = 'old-password';
      createdUser = await createUser.execute({
        name: 'Jane Doe',
        role: UserRole.USER,
        password: oldPassword,
      });
    });

    when('changes the password', async () => {
      await changePassword.execute({
        userId: createdUser.id!,
        newPassword: 'new-password',
      });
    });

    then('the new password should be stored', async () => {
      const stored = await users.findById(createdUser.id!);
      expect(await hasher.verify('new-password', stored!.passwordHash)).toBe(
        true,
      );
    });

    and('the old password should no longer be valid', async () => {
      const stored = await users.findById(createdUser.id!);
      expect(await hasher.verify(oldPassword, stored!.passwordHash)).toBe(
        false,
      );
    });
  });

  test('Promote a user to administrator', ({ given, and, when, then }) => {
    anAdministratorIsAuthenticated(given);

    and('a user exists with role USER', async () => {
      createdUser = await createUser.execute({
        name: 'Jane Doe',
        role: UserRole.USER,
        password: 'initial-password',
      });
    });

    when("changes the user's role to ADMIN", async () => {
      await changeUserRole.execute({
        userId: createdUser.id!,
        role: UserRole.ADMIN,
      });
    });

    then('the user role should be ADMIN', async () => {
      const stored = await users.findById(createdUser.id!);
      expect(stored!.role).toBe(UserRole.ADMIN);
    });
  });

  test('Creating a user with a taken name is rejected', ({
    given,
    and,
    when,
    then,
  }) => {
    anAdministratorIsAuthenticated(given);

    and('a user named "Jane Doe" already exists', async () => {
      createdUser = await createUser.execute({
        name: 'Jane Doe',
        role: UserRole.USER,
        password: 'initial-password',
      });
    });

    when('creating another user named "Jane Doe"', async () => {
      try {
        await createUser.execute({
          name: 'Jane Doe',
          role: UserRole.USER,
          password: 'another-password',
        });
      } catch (error) {
        if (error instanceof UserNameTakenError) {
          conflictRejected = true;
        } else {
          throw error;
        }
      }
    });

    then('the creation is rejected as a conflict', () => {
      expect(conflictRejected).toBe(true);
    });
  });
});
