import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  DomainError,
  NotFoundError,
} from '@/shared/domain/domain-error';

/**
 * Translates domain errors into HTTP responses at the delivery boundary, so
 * controllers can let business failures propagate instead of mapping status
 * codes by hand. The mapping is driven by the domain error CATEGORY
 * (polymorphism over the DomainError hierarchy), not by enumerating concrete
 * error classes.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(error);
    response.status(status).json({
      statusCode: status,
      message: error.message,
      error: error.name,
    });
  }

  private statusFor(error: DomainError): HttpStatus {
    if (error instanceof NotFoundError) {
      return HttpStatus.NOT_FOUND;
    }
    if (error instanceof AuthenticationError) {
      return HttpStatus.UNAUTHORIZED;
    }
    if (error instanceof AuthorizationError) {
      return HttpStatus.FORBIDDEN;
    }
    if (error instanceof ConflictError) {
      return HttpStatus.CONFLICT;
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
