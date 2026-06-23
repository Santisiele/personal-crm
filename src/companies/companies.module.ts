import { Module } from '@nestjs/common';
import { CompaniesService } from '@/companies/companies.service';
import { CompaniesController } from '@/companies/companies.controller';

@Module({
  providers: [CompaniesService],
  controllers: [CompaniesController]
})
export class CompaniesModule {}
