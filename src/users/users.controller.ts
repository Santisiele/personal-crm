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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentActor } from '@/auth/current-actor.decorator';
import { Public } from '@/auth/public.decorator';
import type { Actor } from '@/shared/domain/actor';
import { CreateUser } from '@/users/application/create-user.use-case';
import { ChangePassword } from '@/users/application/change-password.use-case';
import { ChangeUserRole } from '@/users/application/change-user-role.use-case';
import { DeactivateUser } from '@/users/application/deactivate-user.use-case';
import { ListUsers } from '@/users/application/list-users.use-case';
import { ListAssignableUsers } from '@/users/application/list-assignable-users.use-case';
import { ViewUser } from '@/users/application/view-user.use-case';
import { CreateUserDto } from '@/users/dto/create-user.dto';
import { ChangePasswordDto } from '@/users/dto/change-password.dto';
import { ChangeUserRoleDto } from '@/users/dto/change-user-role.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly createUser: CreateUser,
    private readonly changePassword: ChangePassword,
    private readonly changeUserRole: ChangeUserRole,
    private readonly deactivateUser: DeactivateUser,
    private readonly listUsers: ListUsers,
    private readonly listAssignableUsers: ListAssignableUsers,
    private readonly viewUser: ViewUser,
  ) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Register a new user (always a plain USER; role is not accepted)',
  })
  @ApiCreatedResponse({
    description: 'User created; returns id, name and role (always USER).',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (e.g. a role was supplied).',
  })
  @ApiResponse({
    status: 409,
    description: 'A user with that name already exists.',
  })
  async create(@Body() body: CreateUserDto) {
    // Registration never confers privilege: the use case always mints a USER.
    // Elevating a role goes through PATCH /users/:id/role, which is authorized.
    const user = await this.createUser.execute({
      name: body.name,
      password: body.password,
    });
    return { id: user.id, name: user.name, role: user.role };
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all users (privileged only)' })
  @ApiOkResponse({
    description: 'Returns the user directory as a list of safe user views.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not privileged (ADMIN/CREATOR).',
  })
  async findAll(@CurrentActor() actor: Actor) {
    return this.listUsers.execute({ actor });
  }

  @Get('assignable')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'List users a task may be assigned to (id + name only)',
  })
  @ApiOkResponse({
    description:
      'The assignable directory (id + name) for any authenticated user.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async assignable() {
    return this.listAssignableUsers.execute();
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'View a single user by id' })
  @ApiParam({ name: 'id', description: 'User id' })
  @ApiOkResponse({ description: 'Returns the safe user view.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Actor may not view this user.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.viewUser.execute({ actor, userId: id });
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Change the authenticated user's own password" })
  @ApiNoContentResponse({ description: 'Password changed.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
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
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Change a user's role (CREATOR only, in practice)" })
  @ApiParam({ name: 'id', description: 'User id' })
  @ApiNoContentResponse({ description: 'Role changed.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Actor may not grant that role.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async changeRole(
    @Param('id') id: string,
    @Body() body: ChangeUserRoleDto,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    await this.changeUserRole.execute({ actor, userId: id, role: body.role });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Deactivate a user (logical delete, privileged only)',
  })
  @ApiParam({ name: 'id', description: 'User id' })
  @ApiNoContentResponse({ description: 'User deactivated.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not privileged (ADMIN/CREATOR).',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async deactivate(
    @Param('id') id: string,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    await this.deactivateUser.execute({ actor, userId: id });
  }
}
