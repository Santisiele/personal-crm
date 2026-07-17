import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { User } from '@/users/domain/user';
import { Actor } from '@/shared/domain/actor';
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
  let actor: Actor;
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

  const aCreatorIsAuthenticated = (given: DefineStepFunction) => {
    given('a creator is authenticated', async () => {
      // Role assignment is gated, so the acting principal must be a real stored
      // user with the authority to grant roles (see role_assignment.feature).
      const me = User.create({
        name: 'Acting Creator',
        role: UserRole.CREATOR,
        passwordHash: 'hashed',
      });
      await users.save(me);
      actor = { id: me.id!, role: UserRole.CREATOR };
    });
  };

  test('Registering a user creates a plain user', ({ when, then, and }) => {
    when('someone registers', async () => {
      // Registration takes no role: the use case always mints a plain USER, so
      // sign-up can never confer privilege.
      createdUser = await createUser.execute({
        name: 'Jane Doe',
        password: 'initial-password',
      });
    });

    then('the user should be stored', async () => {
      const stored = await users.findById(createdUser.id!);
      expect(stored).not.toBeNull();
    });

    and('the user role should be USER', () => {
      expect(createdUser.role).toBe(UserRole.USER);
    });
  });

  test('Change own password', ({ given, when, then, and }) => {
    given('a user is authenticated', async () => {
      oldPassword = 'old-password';
      createdUser = await createUser.execute({
        name: 'Jane Doe',
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
    aCreatorIsAuthenticated(given);

    and('a user exists with role USER', async () => {
      createdUser = await createUser.execute({
        name: 'Jane Doe',
        password: 'initial-password',
      });
    });

    when("changes the user's role to ADMIN", async () => {
      await changeUserRole.execute({
        actor,
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
    when,
    then,
  }) => {
    given('a user named "Jane Doe" already exists', async () => {
      createdUser = await createUser.execute({
        name: 'Jane Doe',
        password: 'initial-password',
      });
    });

    when('creating another user named "Jane Doe"', async () => {
      try {
        await createUser.execute({
          name: 'Jane Doe',
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
