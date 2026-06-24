import { Body, Controller, Post } from '@nestjs/common';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { CreateCompany } from '@/companies/application/create-company.use-case';
import { CreateCompanyDto } from '@/companies/dto/create-company.dto';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly createCompany: CreateCompany) {}

  @Post()
  async create(@Body() body: CreateCompanyDto, @CurrentActor() actor: Actor) {
    const company = await this.createCompany.execute({
      actor,
      companyName: body.companyName,
      cuit: body.cuit,
      brand: body.brand,
      product: body.product,
      origin: body.origin,
    });
    return {
      id: company.id,
      companyName: company.companyName,
      ownerId: company.ownerId,
    };
  }
}
