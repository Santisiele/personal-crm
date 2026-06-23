import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersController } from './users.controller';
import { USER_REPOSITORY } from './domain/user.repository';
import { PASSWORD_HASHER, PasswordHasher } from './domain/password-hasher';
import { UserRepository } from './domain/user.repository';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { ScryptPasswordHasher } from './infrastructure/hashing/scrypt-password-hasher';
import { CreateUser } from './application/create-user.use-case';
import { ChangePassword } from './application/change-password.use-case';
import { ChangeUserRole } from './application/change-user-role.use-case';

/**
 * Composition root for the users context. Binds the driven ports to their
 * production adapters and wires the application services via factories, so the
 * domain and application layers stay free of any NestJS dependency.
 */
@Module({
  providers: [
    {
      provide: USER_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaUserRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: PASSWORD_HASHER,
      useFactory: () => new ScryptPasswordHasher(),
    },
    {
      provide: CreateUser,
      useFactory: (users: UserRepository, hasher: PasswordHasher) =>
        new CreateUser(users, hasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
    {
      provide: ChangePassword,
      useFactory: (users: UserRepository, hasher: PasswordHasher) =>
        new ChangePassword(users, hasher),
      inject: [USER_REPOSITORY, PASSWORD_HASHER],
    },
    {
      provide: ChangeUserRole,
      useFactory: (users: UserRepository) => new ChangeUserRole(users),
      inject: [USER_REPOSITORY],
    },
  ],
  controllers: [UsersController],
  exports: [CreateUser, ChangePassword, ChangeUserRole],
})
export class UsersModule {}
