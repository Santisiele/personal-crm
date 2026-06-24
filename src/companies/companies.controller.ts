import { Body, Controller, Param, Post } from '@nestjs/common';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { CreateCompany } from '@/companies/application/create-company.use-case';
import { LinkContactToCompany } from '@/companies/application/link-contact-to-company.use-case';
import { CreateCompanyDto } from '@/companies/dto/create-company.dto';
import { LinkContactDto } from '@/companies/dto/link-contact.dto';

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly createCompany: CreateCompany,
    private readonly linkContactToCompany: LinkContactToCompany,
  ) {}

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

  @Post(':id/contacts')
  async linkContact(
    @Param('id') id: string,
    @Body() body: LinkContactDto,
    @CurrentActor() actor: Actor,
  ) {
    const link = await this.linkContactToCompany.execute({
      actor,
      companyId: id,
      contactId: body.contactId,
      roleInCompany: body.roleInCompany,
      phone: body.phone,
    });
    return {
      id: link.id,
      companyId: link.companyId,
      contactId: link.contactId,
      roleInCompany: link.roleInCompany,
      phone: link.phone,
    };
  }
}
