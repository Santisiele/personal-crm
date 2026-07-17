import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * Public registration payload. It deliberately carries no role: sign-up always
 * creates a plain USER, so an unauthenticated caller cannot mint a privileged
 * account. Because the global ValidationPipe runs with forbidNonWhitelisted, a
 * request that tries to smuggle a `role` is rejected with 400 rather than
 * silently ignored. Elevation happens only via PATCH /users/:id/role.
 */
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsString()
  @MinLength(8)
  readonly password: string;
}
