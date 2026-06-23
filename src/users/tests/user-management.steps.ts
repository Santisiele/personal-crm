import { loadFeature, defineFeature } from 'jest-cucumber';
import { UserRole } from '../domain/user-role';
import { User } from '../domain/user';
import { CreateUser } from '../application/create-user.use-case';
import { InMemoryUserRepository } from '../infrastructure/persistence/in-memory-user.repository';
import { SequentialIdGenerator } from './doubles/sequential-id-generator';

const feature = loadFeature('specs/user_managment.feature', { errors: false });

defineFeature(feature, (test) => {
  let users: InMemoryUserRepository;
  let createUser: CreateUser;
  let createdUser: User;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    createUser = new CreateUser(users, new SequentialIdGenerator());
  });

  const anAdministratorIsAuthenticated = (given: any) =>
    given('an administrator is authenticated', () => {
      // No authorization rule is exercised by these scenarios yet (there is no
      // rejection scenario), so the authenticated admin is just the acting
      // context. Enforcement will be introduced when a scenario demands it.
    });

  const createsAUserWithRole = (when: any) =>
    when(/^creates a user with role (.*)$/, async (role: string) => {
      createdUser = await createUser.execute({
        name: 'Jane Doe',
        role: UserRole[role as keyof typeof UserRole],
      });
    });

  const theUserShouldBeStored = (then: any) =>
    then('the user should be stored', async () => {
      const stored = await users.findById(createdUser.id);
      expect(stored).not.toBeNull();
    });

  const theUserRoleShouldBe = (and: any) =>
    and(/^the user role should be (.*)$/, (role: string) => {
      expect(createdUser.role).toBe(UserRole[role as keyof typeof UserRole]);
    });

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
});
