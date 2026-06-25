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
import { CompanyStatus } from '@/companies/domain/company-status';
import { CreateCompanyStatus } from '@/companies/application/create-company-status.use-case';
import { ListCompanyStatuses } from '@/companies/application/list-company-statuses.use-case';
import { CreateCompanyStatusDto } from '@/companies/dto/create-company-status.dto';

@ApiTags('company-statuses')
@ApiBearerAuth('access-token')
@Controller('company-statuses')
export class CompanyStatusesController {
  constructor(
    private readonly createCompanyStatus: CreateCompanyStatus,
    private readonly listCompanyStatuses: ListCompanyStatuses,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a company status (CREATOR only)' })
  @ApiCreatedResponse({
    description: 'Company status created; returns id and description.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Actor is not a CREATOR.' })
  @ApiResponse({
    status: 409,
    description: 'A company status with that description already exists.',
  })
  async create(
    @Body() body: CreateCompanyStatusDto,
    @CurrentActor() actor: Actor,
  ) {
    const status = await this.createCompanyStatus.execute({
      actor,
      description: body.description,
    });
    return this.serialize(status);
  }

  @Get()
  @ApiOperation({ summary: 'List company statuses (CREATOR only)' })
  @ApiOkResponse({ description: 'Returns the list of company statuses.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 403, description: 'Actor is not a CREATOR.' })
  async findAll(@CurrentActor() actor: Actor) {
    const statuses = await this.listCompanyStatuses.execute({ actor });
    return statuses.map((status) => this.serialize(status));
  }

  private serialize(status: CompanyStatus) {
    return {
      id: status.id,
      description: status.description,
    };
  }
}
