import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { CreateUser } from '@/users/application/create-user.use-case';
import { ChangePassword } from '@/users/application/change-password.use-case';
import { ChangeUserRole } from '@/users/application/change-user-role.use-case';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { ChangePasswordDto } from '@/users/dto/change-password.dto';
import { ChangeUserRoleDto } from '@/users/dto/change-user-role.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUser,
    private readonly changePassword: ChangePassword,
    private readonly changeUserRole: ChangeUserRole,
  ) {}

  @Post()
  async create(@Body() body: CreateUserDto) {
    const user = await this.createUser.execute({
      name: body.name,
      role: body.role,
      password: body.password,
    });
    return { id: user.id, name: user.name, role: user.role };
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeOwnPassword(
    @CurrentActor() actor: Actor,
    @Body() body: ChangePasswordDto,
  ): Promise<void> {
    await this.changePassword.execute({
      userId: actor.id,
      newPassword: body.newPassword,
    });
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeRole(
    @Param('id') id: string,
    @Body() body: ChangeUserRoleDto,
  ): Promise<void> {
    await this.changeUserRole.execute({ userId: id, role: body.role });
  }
}
