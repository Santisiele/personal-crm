import { IsEnum } from 'class-validator';
import { UserRole } from '../domain/user-role';

export class ChangeUserRoleDto {
  @IsEnum(UserRole)
  readonly role: UserRole;
}
