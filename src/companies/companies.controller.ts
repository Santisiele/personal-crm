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
import type { Actor } from '@/shared/domain/actor';
import { Company } from '@/companies/domain/company';
import { CreateCompany } from '@/companies/application/create-company.use-case';
import { LinkContactToCompany } from '@/companies/application/link-contact-to-company.use-case';
import { ListCompanies } from '@/companies/application/list-companies.use-case';
import {
  CompanyWithContacts,
  ViewCompany,
} from '@/companies/application/view-company.use-case';
import { EditCompany } from '@/companies/application/edit-company.use-case';
import { ChangeCompanyStatus } from '@/companies/application/change-company-status.use-case';
import { DeleteCompany } from '@/companies/application/delete-company.use-case';
import { CreateCompanyDto } from '@/companies/dto/create-company.dto';
import { LinkContactDto } from '@/companies/dto/link-contact.dto';
import { EditCompanyDto } from '@/companies/dto/edit-company.dto';
import { ChangeCompanyStatusDto } from '@/companies/dto/change-company-status.dto';

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly createCompany: CreateCompany,
    private readonly linkContactToCompany: LinkContactToCompany,
    private readonly listCompanies: ListCompanies,
    private readonly viewCompany: ViewCompany,
    private readonly editCompany: EditCompany,
    private readonly changeCompanyStatus: ChangeCompanyStatus,
    private readonly deleteCompany: DeleteCompany,
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
    return this.serialize(company);
  }

  @Get()
  async findAll() {
    const companies = await this.listCompanies.execute();
    return companies.map((company) => this.serialize(company));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.viewCompany.execute({ companyId: id });
    return this.serializeWithContacts(result);
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

  @Patch(':id')
  async edit(
    @Param('id') id: string,
    @Body() body: EditCompanyDto,
    @CurrentActor() actor: Actor,
  ) {
    const company = await this.editCompany.execute({
      actor,
      companyId: id,
      companyName: body.companyName,
      cuit: body.cuit,
      brand: body.brand,
      product: body.product,
      origin: body.origin,
    });
    return this.serialize(company);
  }

  @Patch(':id/status')
  async changeStatus(
    @Param('id') id: string,
    @Body() body: ChangeCompanyStatusDto,
    @CurrentActor() actor: Actor,
  ) {
    const company = await this.changeCompanyStatus.execute({
      actor,
      companyId: id,
      status: body.status,
    });
    return this.serialize(company);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @CurrentActor() actor: Actor) {
    await this.deleteCompany.execute({ actor, companyId: id });
  }

  private serialize(company: Company) {
    return {
      id: company.id,
      companyName: company.companyName,
      ownerId: company.ownerId,
      cuit: company.cuit,
      brand: company.brand,
      product: company.product,
      origin: company.origin,
      status: company.status,
    };
  }

  private serializeWithContacts(result: CompanyWithContacts) {
    return {
      ...this.serialize(result.company),
      contacts: result.contacts.map((linked) => ({
        id: linked.contact.id,
        contactName: linked.contact.contactName,
        email: linked.contact.email,
        roleInCompany: linked.roleInCompany,
        phone: linked.phone,
      })),
    };
  }
}
