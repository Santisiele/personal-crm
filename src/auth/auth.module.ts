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
import { RefreshAccessToken } from '@/auth/refresh-access-token.use-case';
import { TOKEN_ISSUER, TokenIssuer } from '@/auth/token-issuer';
import { JwtTokenIssuer } from '@/auth/jwt-token-issuer';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { JWT_SECRET } from '@/auth/jwt-secret';

const ONE_HOUR_SECONDS = 60 * 60;
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;

/** Reads a positive-integer TTL from an env var, falling back to a default. */
const ttlFromEnv = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

/**
 * Composition root for authentication. Wires the Login and RefreshAccessToken
 * application services against the users context's driven ports, signs and
 * verifies tokens via the TokenIssuer adapter, and installs a global guard so
 * every route is protected unless explicitly marked @Public().
 *
 * The signing secret comes from JWT_SECRET (env), with a dev-only fallback.
 * Access and refresh lifetimes default to 1h / 7d and can be overridden via
 * JWT_ACCESS_TTL_SECONDS / JWT_REFRESH_TTL_SECONDS.
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
      useFactory: (secret: string) =>
        new JwtTokenIssuer(secret, {
          accessTtlSeconds: ttlFromEnv(
            'JWT_ACCESS_TTL_SECONDS',
            ONE_HOUR_SECONDS,
          ),
          refreshTtlSeconds: ttlFromEnv(
            'JWT_REFRESH_TTL_SECONDS',
            SEVEN_DAYS_SECONDS,
          ),
        }),
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
      provide: RefreshAccessToken,
      useFactory: (tokens: TokenIssuer) => new RefreshAccessToken(tokens),
      inject: [TOKEN_ISSUER],
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
