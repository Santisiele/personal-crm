import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentActor } from '@/auth/current-actor.decorator';
import { Public } from '@/auth/public.decorator';
import type { Actor } from '@/shared/domain/actor';
import { CreateUser } from '@/users/application/create-user.use-case';
import { ChangePassword } from '@/users/application/change-password.use-case';
import { ChangeUserRole } from '@/users/application/change-user-role.use-case';
import { DeactivateUser } from '@/users/application/deactivate-user.use-case';
import { ListUsers } from '@/users/application/list-users.use-case';
import { ViewUser } from '@/users/application/view-user.use-case';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { ChangePasswordDto } from '@/users/dto/change-password.dto';
import { ChangeUserRoleDto } from '@/users/dto/change-user-role.dto';

@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUser,
    private readonly changePassword: ChangePassword,
    private readonly changeUserRole: ChangeUserRole,
    private readonly deactivateUser: DeactivateUser,
    private readonly listUsers: ListUsers,
    private readonly viewUser: ViewUser,
  ) {}

  @Public()
  @Post()
  async create(@Body() body: CreateUserDto) {
    const user = await this.createUser.execute({
      name: body.name,
      role: body.role,
      password: body.password,
    });
    return { id: user.id, name: user.name, role: user.role };
  }

  @Get()
  async findAll(@CurrentActor() actor: Actor) {
    return this.listUsers.execute({ actor });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.viewUser.execute({ actor, userId: id });
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param('id') id: string,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    await this.deactivateUser.execute({ actor, userId: id });
  }
}
