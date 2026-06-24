import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verify, type JwtPayload } from 'jsonwebtoken';
import type { Request } from 'express';
import { Actor } from '@/shared/domain/actor';
import { UserRole } from '@/users/domain/user-role';
import { IS_PUBLIC_KEY } from '@/auth/public.decorator';
import { JWT_SECRET } from '@/auth/jwt-secret';

/**
 * Global guard verifying the Bearer JWT on every request. Routes flagged with
 * @Public() bypass verification. On success the decoded principal is attached to
 * `request.user`, which the @CurrentActor decorator then reads. This is the
 * single seam where transport credentials become a domain Actor.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(JWT_SECRET) private readonly secret: string,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: Actor }>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException();
    }

    try {
      const payload = verify(token, this.secret) as JwtPayload & {
        sub: string;
        role: UserRole;
      };
      request.user = { id: payload.sub, role: payload.role };
    } catch {
      throw new UnauthorizedException();
    }
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers['authorization'];
    if (typeof header !== 'string') {
      return null;
    }
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
