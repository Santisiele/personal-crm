import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UsersController } from '@/users/users.controller';
import { RolesController } from '@/users/roles.controller';
import { USER_REPOSITORY } from '@/users/domain/user.repository';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '@/users/domain/password-hasher';
import { UserRepository } from '@/users/domain/user.repository';
import {
  ROLE_REPOSITORY,
  RoleRepository,
} from '@/users/domain/role.repository';
import { PrismaUserRepository } from '@/users/infrastructure/persistence/prisma-user.repository';
import { PrismaRoleRepository } from '@/users/infrastructure/persistence/prisma-role.repository';
import { ScryptPasswordHasher } from '@/users/infrastructure/hashing/scrypt-password-hasher';
import { CreateUser } from '@/users/application/create-user.use-case';
import { ChangePassword } from '@/users/application/change-password.use-case';
import { ChangeUserRole } from '@/users/application/change-user-role.use-case';
import { DeactivateUser } from '@/users/application/deactivate-user.use-case';
import { ListUsers } from '@/users/application/list-users.use-case';
import { ListAssignableUsers } from '@/users/application/list-assignable-users.use-case';
import { ViewUser } from '@/users/application/view-user.use-case';
import { CreateRole } from '@/users/application/create-role.use-case';
import { ListRoles } from '@/users/application/list-roles.use-case';

/**
 * Composition root for the users context. Binds the driven ports to their
 * production adapters and wires the application services via factories, so the
 * domain and application layers stay free of any NestJS dependency.
 *
 * The USER_REPOSITORY and PASSWORD_HASHER tokens are re-exported so that other
 * contexts (e.g. AuthModule) can compose against the same driven ports.
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
      provide: ROLE_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaRoleRepository(prisma),
      inject: [PrismaService],
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
    {
      provide: DeactivateUser,
      useFactory: (users: UserRepository) => new DeactivateUser(users),
      inject: [USER_REPOSITORY],
    },
    {
      provide: ListUsers,
      useFactory: (users: UserRepository) => new ListUsers(users),
      inject: [USER_REPOSITORY],
    },
    {
      provide: ListAssignableUsers,
      useFactory: (users: UserRepository) => new ListAssignableUsers(users),
      inject: [USER_REPOSITORY],
    },
    {
      provide: ViewUser,
      useFactory: (users: UserRepository) => new ViewUser(users),
      inject: [USER_REPOSITORY],
    },
    {
      provide: CreateRole,
      useFactory: (roles: RoleRepository) => new CreateRole(roles),
      inject: [ROLE_REPOSITORY],
    },
    {
      provide: ListRoles,
      useFactory: (roles: RoleRepository) => new ListRoles(roles),
      inject: [ROLE_REPOSITORY],
    },
  ],
  controllers: [UsersController, RolesController],
  exports: [
    CreateUser,
    ChangePassword,
    ChangeUserRole,
    DeactivateUser,
    ListUsers,
    ViewUser,
    CreateRole,
    ListRoles,
    USER_REPOSITORY,
    PASSWORD_HASHER,
    ROLE_REPOSITORY,
  ],
})
export class UsersModule {}
