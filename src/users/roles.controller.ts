import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { CreateRole } from '@/users/application/create-role.use-case';
import { ListRoles } from '@/users/application/list-roles.use-case';
import { CreateRoleDto } from '@/users/dto/create-role.dto';

@ApiTags('roles')
@ApiBearerAuth('access-token')
@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRole: CreateRole,
    private readonly listRoles: ListRoles,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a role (CREATOR only)' })
  @ApiCreatedResponse({
    description: 'Role created; returns id and description.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Actor is not a CREATOR.' })
  @ApiResponse({
    status: 409,
    description: 'A role with that description already exists.',
  })
  async create(@CurrentActor() actor: Actor, @Body() body: CreateRoleDto) {
    const role = await this.createRole.execute({
      actor,
      description: body.description,
    });
    return { id: role.id, description: role.description };
  }

  @Get()
  @ApiOperation({ summary: 'List all roles (CREATOR only)' })
  @ApiOkResponse({
    description: 'Returns the roles as a list of id/description pairs.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Actor is not a CREATOR.' })
  async findAll(@CurrentActor() actor: Actor) {
    const roles = await this.listRoles.execute({ actor });
    return roles.map((role) => ({
      id: role.id,
      description: role.description,
    }));
  }
}
