import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ContactsModule } from '@/contacts/contacts.module';
import {
  CONTACT_REPOSITORY,
  ContactRepository,
} from '@/contacts/domain/contact.repository';
import { CompaniesController } from '@/companies/companies.controller';
import { CompanyStatusesController } from '@/companies/company-statuses.controller';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '@/companies/domain/company.repository';
import {
  COMPANY_CONTACT_LINK_REPOSITORY,
  CompanyContactLinkRepository,
} from '@/companies/domain/company-contact-link.repository';
import {
  COMPANY_STATUS_REPOSITORY,
  CompanyStatusRepository,
} from '@/companies/domain/company-status.repository';
import { PrismaCompanyRepository } from '@/companies/infrastructure/persistence/prisma-company.repository';
import { PrismaCompanyContactLinkRepository } from '@/companies/infrastructure/persistence/prisma-company-contact-link.repository';
import { PrismaCompanyStatusRepository } from '@/companies/infrastructure/persistence/prisma-company-status.repository';
import { CreateCompany } from '@/companies/application/create-company.use-case';
import { CreateCompanyStatus } from '@/companies/application/create-company-status.use-case';
import { ListCompanyStatuses } from '@/companies/application/list-company-statuses.use-case';
import { DeleteCompanyStatus } from '@/companies/application/delete-company-status.use-case';
import { LinkContactToCompany } from '@/companies/application/link-contact-to-company.use-case';
import { ListCompanies } from '@/companies/application/list-companies.use-case';
import { ViewCompany } from '@/companies/application/view-company.use-case';
import { EditCompany } from '@/companies/application/edit-company.use-case';
import { ChangeCompanyStatus } from '@/companies/application/change-company-status.use-case';
import { DeleteCompany } from '@/companies/application/delete-company.use-case';

/**
 * Composition root for the companies context. Binds the repository ports to
 * their Prisma adapters and wires the application services via factories,
 * keeping the domain and application layers free of any NestJS dependency.
 * Imports ContactsModule to reuse the ContactRepository when linking contacts.
 */
@Module({
  imports: [ContactsModule],
  providers: [
    {
      provide: COMPANY_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaCompanyRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: COMPANY_CONTACT_LINK_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaCompanyContactLinkRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: COMPANY_STATUS_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaCompanyStatusRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: CreateCompany,
      useFactory: (companies: CompanyRepository) =>
        new CreateCompany(companies),
      inject: [COMPANY_REPOSITORY],
    },
    {
      provide: LinkContactToCompany,
      useFactory: (
        companies: CompanyRepository,
        contacts: ContactRepository,
        links: CompanyContactLinkRepository,
      ) => new LinkContactToCompany(companies, contacts, links),
      inject: [
        COMPANY_REPOSITORY,
        CONTACT_REPOSITORY,
        COMPANY_CONTACT_LINK_REPOSITORY,
      ],
    },
    {
      provide: ListCompanies,
      useFactory: (companies: CompanyRepository) =>
        new ListCompanies(companies),
      inject: [COMPANY_REPOSITORY],
    },
    {
      provide: ViewCompany,
      useFactory: (
        companies: CompanyRepository,
        links: CompanyContactLinkRepository,
        contacts: ContactRepository,
      ) => new ViewCompany(companies, links, contacts),
      inject: [
        COMPANY_REPOSITORY,
        COMPANY_CONTACT_LINK_REPOSITORY,
        CONTACT_REPOSITORY,
      ],
    },
    {
      provide: EditCompany,
      useFactory: (companies: CompanyRepository) => new EditCompany(companies),
      inject: [COMPANY_REPOSITORY],
    },
    {
      provide: ChangeCompanyStatus,
      useFactory: (companies: CompanyRepository) =>
        new ChangeCompanyStatus(companies),
      inject: [COMPANY_REPOSITORY],
    },
    {
      provide: DeleteCompany,
      useFactory: (companies: CompanyRepository) =>
        new DeleteCompany(companies),
      inject: [COMPANY_REPOSITORY],
    },
    {
      provide: CreateCompanyStatus,
      useFactory: (statuses: CompanyStatusRepository) =>
        new CreateCompanyStatus(statuses),
      inject: [COMPANY_STATUS_REPOSITORY],
    },
    {
      provide: ListCompanyStatuses,
      useFactory: (statuses: CompanyStatusRepository) =>
        new ListCompanyStatuses(statuses),
      inject: [COMPANY_STATUS_REPOSITORY],
    },
    {
      provide: DeleteCompanyStatus,
      useFactory: (statuses: CompanyStatusRepository) =>
        new DeleteCompanyStatus(statuses),
      inject: [COMPANY_STATUS_REPOSITORY],
    },
  ],
  controllers: [CompaniesController, CompanyStatusesController],
  exports: [
    CreateCompany,
    LinkContactToCompany,
    ListCompanies,
    ViewCompany,
    EditCompany,
    ChangeCompanyStatus,
    DeleteCompany,
    CreateCompanyStatus,
    ListCompanyStatuses,
    DeleteCompanyStatus,
  ],
})
export class CompaniesModule {}
