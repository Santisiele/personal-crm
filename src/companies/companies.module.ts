import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ContactsModule } from '@/contacts/contacts.module';
import {
  CONTACT_REPOSITORY,
  ContactRepository,
} from '@/contacts/domain/contact.repository';
import { CompaniesController } from '@/companies/companies.controller';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '@/companies/domain/company.repository';
import {
  COMPANY_CONTACT_LINK_REPOSITORY,
  CompanyContactLinkRepository,
} from '@/companies/domain/company-contact-link.repository';
import { PrismaCompanyRepository } from '@/companies/infrastructure/persistence/prisma-company.repository';
import { PrismaCompanyContactLinkRepository } from '@/companies/infrastructure/persistence/prisma-company-contact-link.repository';
import { CreateCompany } from '@/companies/application/create-company.use-case';
import { LinkContactToCompany } from '@/companies/application/link-contact-to-company.use-case';

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
  ],
  controllers: [CompaniesController],
  exports: [CreateCompany, LinkContactToCompany],
})
export class CompaniesModule {}
