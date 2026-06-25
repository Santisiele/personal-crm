import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { CreateRole } from '@/users/application/create-role.use-case';
import { ListRoles } from '@/users/application/list-roles.use-case';
import { CreateRoleDto } from '@/users/dto/create-role.dto';

@Controller('roles')
export class RolesController {
  constructor(
    private readonly createRole: CreateRole,
    private readonly listRoles: ListRoles,
  ) {}

  @Post()
  async create(@CurrentActor() actor: Actor, @Body() body: CreateRoleDto) {
    const role = await this.createRole.execute({
      actor,
      description: body.description,
    });
    return { id: role.id, description: role.description };
  }

  @Get()
  async findAll(@CurrentActor() actor: Actor) {
    const roles = await this.listRoles.execute({ actor });
    return roles.map((role) => ({
      id: role.id,
      description: role.description,
    }));
  }
}
