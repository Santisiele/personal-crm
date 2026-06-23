import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';

/**
 * Resolves the authenticated principal for a request.
 *
 * Until the AuthModule issues real credentials, it reads the `x-user-id` and
 * `x-user-role` headers. This is the SINGLE seam to replace when authentication
 * lands: controllers depend only on the resulting Actor, never on how it was
 * obtained.
 */
export const CurrentActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Actor => {
    const request = ctx.switchToHttp().getRequest();
    const id = request.headers['x-user-id'];
    const role = request.headers['x-user-role'];
    if (typeof id !== 'string' || !isUserRole(role)) {
      throw new UnauthorizedException('Missing or invalid actor headers');
    }
    return { id, role };
  },
);

function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    (Object.values(UserRole) as string[]).includes(value)
  );
}
