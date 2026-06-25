import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { CompanyStatus } from '@/companies/domain/company-status';
import { CreateCompanyStatus } from '@/companies/application/create-company-status.use-case';
import { ListCompanyStatuses } from '@/companies/application/list-company-statuses.use-case';
import { CreateCompanyStatusDto } from '@/companies/dto/create-company-status.dto';

@Controller('company-statuses')
export class CompanyStatusesController {
  constructor(
    private readonly createCompanyStatus: CreateCompanyStatus,
    private readonly listCompanyStatuses: ListCompanyStatuses,
  ) {}

  @Post()
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
