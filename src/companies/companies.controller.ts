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

@ApiTags('companies')
@ApiBearerAuth('access-token')
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
  @ApiOperation({ summary: 'Create a company (ADMIN/CREATOR only)' })
  @ApiCreatedResponse({
    description: 'Company created; returns the company view.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not privileged (ADMIN/CREATOR).',
  })
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
  @ApiOperation({ summary: 'List all companies (any authenticated user)' })
  @ApiOkResponse({ description: 'Returns the list of company views.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async findAll() {
    const companies = await this.listCompanies.execute();
    return companies.map((company) => this.serialize(company));
  }

  @Get(':id')
  @ApiOperation({ summary: 'View a company with its linked contacts' })
  @ApiParam({ name: 'id', description: 'Company identifier.' })
  @ApiOkResponse({
    description: 'Returns the company view including linked contacts.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 404, description: 'Company not found.' })
  async findOne(@Param('id') id: string) {
    const result = await this.viewCompany.execute({ companyId: id });
    return this.serializeWithContacts(result);
  }

  @Post(':id/contacts')
  @ApiOperation({
    summary: 'Link an existing contact to a company (privileged only)',
  })
  @ApiParam({ name: 'id', description: 'Company identifier.' })
  @ApiCreatedResponse({
    description: 'Contact linked; returns the link details.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not privileged (ADMIN/CREATOR).',
  })
  @ApiResponse({ status: 404, description: 'Company or contact not found.' })
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
  @ApiOperation({ summary: 'Edit company fields (privileged only)' })
  @ApiParam({ name: 'id', description: 'Company identifier.' })
  @ApiOkResponse({ description: 'Company updated; returns the company view.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not privileged (ADMIN/CREATOR).',
  })
  @ApiResponse({ status: 404, description: 'Company not found.' })
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
  @ApiOperation({ summary: 'Change a company status (privileged only)' })
  @ApiParam({ name: 'id', description: 'Company identifier.' })
  @ApiOkResponse({ description: 'Status changed; returns the company view.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not privileged (ADMIN/CREATOR).',
  })
  @ApiResponse({ status: 404, description: 'Company or status not found.' })
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
  @ApiOperation({ summary: 'Delete a company logically (privileged only)' })
  @ApiParam({ name: 'id', description: 'Company identifier.' })
  @ApiNoContentResponse({
    description: 'Company deleted; no content returned.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Actor is not privileged (ADMIN/CREATOR).',
  })
  @ApiResponse({ status: 404, description: 'Company not found.' })
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
