import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersController } from '@/users/users.controller';
import { USER_REPOSITORY } from '@/users/domain/user.repository';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '@/users/domain/password-hasher';
import { UserRepository } from '@/users/domain/user.repository';
import { PrismaUserRepository } from '@/users/infrastructure/persistence/prisma-user.repository';
import { ScryptPasswordHasher } from '@/users/infrastructure/hashing/scrypt-password-hasher';
import { CreateUser } from '@/users/application/create-user.use-case';
import { ChangePassword } from '@/users/application/change-password.use-case';
import { ChangeUserRole } from '@/users/application/change-user-role.use-case';

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
