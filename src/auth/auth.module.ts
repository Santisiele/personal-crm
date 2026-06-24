import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UsersModule } from '@/users/users.module';
import {
  USER_REPOSITORY,
  UserRepository,
} from '@/users/domain/user.repository';
import {
  PASSWORD_HASHER,
  PasswordHasher,
} from '@/users/domain/password-hasher';
import { AuthController } from '@/auth/auth.controller';
import { Login } from '@/auth/login.use-case';
import { TOKEN_ISSUER, TokenIssuer } from '@/auth/token-issuer';
import { JwtTokenIssuer } from '@/auth/jwt-token-issuer';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { JWT_SECRET } from '@/auth/jwt-secret';

/**
 * Composition root for authentication. Wires the Login application service
 * against the users context's driven ports, signs tokens via the TokenIssuer
 * adapter, and installs a global guard so every route is protected unless
 * explicitly marked @Public(). The signing secret comes from JWT_SECRET (env),
 * with a dev-only fallback.
 */
@Module({
  imports: [UsersModule],
  providers: [
    {
      provide: JWT_SECRET,
      useValue: process.env.JWT_SECRET ?? 'dev-insecure-secret',
    },
    {
      provide: TOKEN_ISSUER,
      useFactory: (secret: string) => new JwtTokenIssuer(secret),
      inject: [JWT_SECRET],
    },
    {
      provide: Login,
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        tokens: TokenIssuer,
      ) => new Login(users, hasher, tokens),
      inject: [USER_REPOSITORY, PASSWORD_HASHER, TOKEN_ISSUER],
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
