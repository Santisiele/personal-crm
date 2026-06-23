import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserRole } from '../domain/user-role';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @IsEnum(UserRole)
  readonly role: UserRole;

  @IsString()
  @MinLength(8)
  readonly password: string;
}
