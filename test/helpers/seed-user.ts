import { PrismaService } from './../../src/prisma/prisma.service';
import { PrismaUserRepository } from './../../src/users/infrastructure/persistence/prisma-user.repository';
import { ScryptPasswordHasher } from './../../src/users/infrastructure/hashing/scrypt-password-hasher';
import { User } from './../../src/users/domain/user';
import { UserRole } from './../../src/users/domain/user-role';

/**
 * Seeds a user with a given role directly through the production persistence and
 * hashing adapters, bypassing the HTTP API.
 *
 * This exists because public registration (POST /users) now always mints a plain
 * USER — sign-up cannot confer privilege — so ADMIN/CREATOR fixtures can no
 * longer be created through the API. Writing them via the same PrismaUserRepository
 * and ScryptPasswordHasher the app uses keeps the seeded row identical to a
 * real one, so logging in with `password` works unchanged.
 *
 * Returns the new user's id (as a string), matching the API's shape.
 */
export async function seedUserWithRole(
  prisma: PrismaService,
  name: string,
  role: string,
  password: string,
): Promise<string> {
  const repository = new PrismaUserRepository(prisma);
  const hasher = new ScryptPasswordHasher();
  const user = User.create({
    name,
    role: role as UserRole,
    passwordHash: await hasher.hash(password),
  });
  await repository.save(user);
  return user.id!;
}
