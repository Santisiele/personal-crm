import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { User } from '@/users/domain/user';
import { Actor } from '@/shared/domain/actor';
import { CreateUser } from '@/users/application/create-user.use-case';
import { ChangePassword } from '@/users/application/change-password.use-case';
import { ChangeUserRole } from '@/users/application/change-user-role.use-case';
import { InMemoryUserRepository } from '@/users/infrastructure/persistence/in-memory-user.repository';
import { FakePasswordHasher } from '@/users/tests/doubles/fake-password-hasher';
import { UserAccessDeniedError } from '@/users/domain/user-access-denied.error';
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
  // A privileged principal used to create accounts (creation is privileged-only).
  let creatorActor: Actor;
  let oldPassword: string;
  let conflictRejected: boolean;
  let denied: boolean;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    hasher = new FakePasswordHasher();
    createUser = new CreateUser(users, hasher);
    changePassword = new ChangePassword(users, hasher);
    changeUserRole = new ChangeUserRole(users);
    conflictRejected = false;
    denied = false;

    const creator = User.create({
      name: 'Acting Creator',
      role: UserRole.CREATOR,
      passwordHash: 'hashed',
    });
    await users.save(creator);
    creatorActor = { id: creator.id!, role: UserRole.CREATOR };
  });

  const create = (name: string, password: string): Promise<User> =>
    createUser.execute({ actor: creatorActor, name, password });

  const aCreatorIsAuthenticated = (given: DefineStepFunction) => {
    given('a creator is authenticated', () => {
      actor = creatorActor;
    });
  };

  test('A privileged actor creates a plain user', ({
    given,
    when,
    then,
    and,
  }) => {
    aCreatorIsAuthenticated(given);

    when('the creator creates a user', async () => {
      createdUser = await createUser.execute({
        actor,
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

  test('A plain user cannot create a user', ({ given, when, then }) => {
    given('a plain user is authenticated', () => {
      actor = { id: 'plain-1', role: UserRole.USER };
    });

    when('the user attempts to create a user', async () => {
      try {
        await createUser.execute({
          actor,
          name: 'Jane Doe',
          password: 'initial-password',
        });
      } catch (error) {
        if (error instanceof UserAccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });

    then('creating the user is denied', async () => {
      expect(denied).toBe(true);
      expect(await users.findByName('Jane Doe')).toBeNull();
    });
  });

  test('Change own password', ({ given, when, then, and }) => {
    given('a user is authenticated', async () => {
      oldPassword = 'old-password';
      createdUser = await create('Jane Doe', oldPassword);
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
      createdUser = await create('Jane Doe', 'initial-password');
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
      createdUser = await create('Jane Doe', 'initial-password');
    });

    when('creating another user named "Jane Doe"', async () => {
      try {
        await create('Jane Doe', 'another-password');
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
