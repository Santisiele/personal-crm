/**
 * The authenticated principal carried by a token: the user's identity (`sub`)
 * and role. Kept transport-agnostic so the application layer never sees a JWT.
 */
export interface TokenPrincipal {
  sub: string;
  role: string;
}

/**
 * Driven port for minting and verifying authentication tokens. Keeps the JWT (or
 * any other) implementation out of the domain and application layers; adapters
 * implement it.
 *
 * Two token kinds are modelled:
 *  - an ACCESS token, short-lived, presented on every protected request;
 *  - a REFRESH token, longer-lived, exchanged for a fresh access token.
 *
 * The two are not interchangeable: verifying a token with the wrong method (e.g.
 * an access token where a refresh token is expected) must fail, and so must an
 * expired or tampered token. Verification rejects with an InvalidTokenError on
 * any such failure.
 */
export interface TokenIssuer {
  issueAccessToken(principal: TokenPrincipal): Promise<string>;
  issueRefreshToken(principal: TokenPrincipal): Promise<string>;
  verifyAccessToken(token: string): Promise<TokenPrincipal>;
  verifyRefreshToken(token: string): Promise<TokenPrincipal>;
}

export const TOKEN_ISSUER = Symbol('TokenIssuer');
