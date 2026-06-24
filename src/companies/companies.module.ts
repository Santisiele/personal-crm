import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CompaniesController } from '@/companies/companies.controller';
import {
  COMPANY_REPOSITORY,
  CompanyRepository,
} from '@/companies/domain/company.repository';
import { PrismaCompanyRepository } from '@/companies/infrastructure/persistence/prisma-company.repository';
import { CreateCompany } from '@/companies/application/create-company.use-case';

/**
 * Composition root for the companies context. Binds the CompanyRepository port
 * to its Prisma adapter and wires the application services via factories,
 * keeping the domain and application layers free of any NestJS dependency.
 */
@Module({
  providers: [
    {
      provide: COMPANY_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaCompanyRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: CreateCompany,
      useFactory: (companies: CompanyRepository) =>
        new CreateCompany(companies),
      inject: [COMPANY_REPOSITORY],
    },
  ],
  controllers: [CompaniesController],
  exports: [CreateCompany],
})
export class CompaniesModule {}
