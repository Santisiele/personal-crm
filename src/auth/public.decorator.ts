import { SetMetadata } from '@nestjs/common';

/** Metadata key marking a route handler (or controller) as publicly accessible. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as public, exempting it from the global JwtAuthGuard. Apply to
 * endpoints that must be reachable without a valid token (e.g. login).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
