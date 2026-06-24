/**
 * Driven port for minting authentication tokens. Keeps the JWT (or any other)
 * implementation out of the domain and application layers; adapters implement
 * it.
 */
export interface TokenIssuer {
  issue(payload: { sub: string; role: string }): Promise<string>;
}

export const TOKEN_ISSUER = Symbol('TokenIssuer');
