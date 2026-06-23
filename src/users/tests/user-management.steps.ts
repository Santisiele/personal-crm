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

  test('Create a normal user', ({ given, when, then, and }) => {
    given('an administrator is authenticated', () => {
      // No authorization rule is exercised by this scenario yet (no rejection
      // scenario), so the authenticated admin is just the acting context.
    });

    when('creates a user with role USER', async () => {
      createdUser = await createUser.execute({
        name: 'Jane Doe',
        role: UserRole.USER,
      });
    });

    then('the user should be stored', async () => {
      const stored = await users.findById(createdUser.id);
      expect(stored).not.toBeNull();
    });

    and('the user role should be USER', () => {
      expect(createdUser.role).toBe(UserRole.USER);
    });
  });
});
