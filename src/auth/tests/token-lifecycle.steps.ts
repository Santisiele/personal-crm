import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { JwtTokenIssuer } from '@/auth/jwt-token-issuer';
import { RefreshAccessToken } from '@/auth/refresh-access-token.use-case';
import { InvalidTokenError } from '@/auth/invalid-token.error';
import { TokenPrincipal } from '@/auth/token-issuer';

const feature = loadFeature('specs/token_lifecycle.feature', { errors: false });

const SECRET = 'test-secret';
const PRINCIPAL: TokenPrincipal = { sub: 'user-1', role: 'USER' };

defineFeature(feature, (test) => {
  let issuer: JwtTokenIssuer;
  let refresh: RefreshAccessToken;
  let accessTtlSeconds: number;
  let refreshTtlSeconds: number;
  let accessToken: string;
  let refreshToken: string;
  let newAccessToken: string;
  let rejected: boolean;

  beforeEach(() => {
    accessTtlSeconds = 3600;
    refreshTtlSeconds = 7 * 24 * 3600;
    rejected = false;
  });

  const buildIssuer = () => {
    issuer = new JwtTokenIssuer(SECRET, {
      accessTtlSeconds,
      refreshTtlSeconds,
    });
    refresh = new RefreshAccessToken(issuer);
  };

  // jsonwebtoken's `exp` has 1-second resolution; allow a token issued with a
  // zero lifetime to actually elapse before it is verified.
  const waitForExpiry = () =>
    new Promise((resolve) => setTimeout(resolve, 1100));

  const aPrincipalIsAuthenticated = (given: DefineStepFunction) => {
    given('a principal is authenticated', () => {
      // principal is the module-level constant; nothing to set up here.
    });
  };

  const accessLifetimeIsZero = (and: DefineStepFunction) => {
    and('the access token lifetime is zero', () => {
      accessTtlSeconds = 0;
    });
  };

  const refreshLifetimeIsZero = (and: DefineStepFunction) => {
    and('the refresh token lifetime is zero', () => {
      refreshTtlSeconds = 0;
    });
  };

  const anAccessTokenIsIssued = (when: DefineStepFunction) => {
    when('an access token is issued for that principal', async () => {
      buildIssuer();
      accessToken = await issuer.issueAccessToken(PRINCIPAL);
    });
  };

  const aRefreshTokenIsIssued = (when: DefineStepFunction) => {
    when('a refresh token is issued for that principal', async () => {
      buildIssuer();
      refreshToken = await issuer.issueRefreshToken(PRINCIPAL);
    });
  };

  const exchange = async (token: string) => {
    try {
      newAccessToken = await refresh.execute({ refreshToken: token });
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        rejected = true;
      } else {
        throw error;
      }
    }
  };

  test('A valid access token identifies its principal', ({
    given,
    when,
    then,
  }) => {
    aPrincipalIsAuthenticated(given);
    anAccessTokenIsIssued(when);
    then('verifying the access token yields the same principal', async () => {
      const principal = await issuer.verifyAccessToken(accessToken);
      expect(principal).toEqual(PRINCIPAL);
    });
  });

  test('An expired access token is rejected', ({ given, and, when, then }) => {
    aPrincipalIsAuthenticated(given);
    accessLifetimeIsZero(and);
    anAccessTokenIsIssued(when);
    then(
      'verifying the access token is rejected as unauthenticated',
      async () => {
        await waitForExpiry();
        await expect(
          issuer.verifyAccessToken(accessToken),
        ).rejects.toBeInstanceOf(InvalidTokenError);
      },
    );
  });

  test('A tampered access token is rejected', ({ given, when, then }) => {
    aPrincipalIsAuthenticated(given);
    anAccessTokenIsIssued(when);
    then(
      'verifying a tampered access token is rejected as unauthenticated',
      async () => {
        await expect(
          issuer.verifyAccessToken(accessToken + 'tampered'),
        ).rejects.toBeInstanceOf(InvalidTokenError);
      },
    );
  });

  test('A refresh token mints a fresh access token', ({
    given,
    when,
    and,
    then,
  }) => {
    aPrincipalIsAuthenticated(given);
    aRefreshTokenIsIssued(when);
    and('the refresh token is exchanged for a new access token', async () => {
      await exchange(refreshToken);
    });
    then(
      'verifying the new access token yields the same principal',
      async () => {
        const principal = await issuer.verifyAccessToken(newAccessToken);
        expect(principal).toEqual(PRINCIPAL);
      },
    );
  });

  test('An expired refresh token is rejected on exchange', ({
    given,
    and,
    when,
    then,
  }) => {
    aPrincipalIsAuthenticated(given);
    refreshLifetimeIsZero(and);
    aRefreshTokenIsIssued(when);
    and('the refresh token is exchanged for a new access token', async () => {
      await waitForExpiry();
      await exchange(refreshToken);
    });
    then('the exchange is rejected as unauthenticated', () => {
      expect(rejected).toBe(true);
    });
  });

  test('An access token cannot be used as a refresh token', ({
    given,
    when,
    and,
    then,
  }) => {
    aPrincipalIsAuthenticated(given);
    anAccessTokenIsIssued(when);
    and('the access token is exchanged for a new access token', async () => {
      await exchange(accessToken);
    });
    then('the exchange is rejected as unauthenticated', () => {
      expect(rejected).toBe(true);
    });
  });
});
