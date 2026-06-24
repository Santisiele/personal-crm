import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Actor } from '@/shared/domain/actor';

/**
 * Resolves the authenticated principal for a request.
 *
 * The global JwtAuthGuard verifies the Bearer token and attaches the principal
 * to `request.user`; this decorator simply surfaces it. Controllers depend only
 * on the resulting Actor, never on how it was obtained.
 */
export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Actor => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: Actor }>();
    if (!request.user) {
      throw new UnauthorizedException();
    }
    return request.user;
  },
);
