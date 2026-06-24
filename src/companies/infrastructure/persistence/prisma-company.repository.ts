import { PrismaClient } from '@prisma/client';
import { Company, CompanyId } from '@/companies/domain/company';
import { CompanyRepository } from '@/companies/domain/company.repository';

/**
 * Prisma-backed driven adapter implementing the CompanyRepository port.
 *
 * Translates between the domain model (string id, owner) and the relational
 * schema (BigInt autoincrement id). The mapping is:
 *
 *  - `ownerId` maps to `company.created_by`.
 *
 * The aggregate does not model statuses, so when a row that needs one is created
 * we fall back to the lowest-id `company_status` as a sane default.
 */
export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(company: Company): Promise<void> {
    const created = await this.prisma.company.create({
      data: {
        company_name: company.companyName,
        cuit: company.cuit,
        brand: company.brand,
        product: company.product,
        origin: company.origin,
        created_by: BigInt(company.ownerId),
        status_id: await this.defaultCompanyStatusId(),
      },
    });
    company.assignId(created.id.toString());
  }

  async findById(id: CompanyId): Promise<Company | null> {
    const row = await this.prisma.company.findUnique({
      where: { id: BigInt(id) },
    });
    if (!row) {
      return null;
    }
    return Company.rehydrate({
      id: row.id.toString(),
      ownerId: row.created_by.toString(),
      companyName: row.company_name,
      cuit: row.cuit,
      brand: row.brand,
      product: row.product,
      origin: row.origin,
    });
  }

  private async defaultCompanyStatusId(): Promise<bigint> {
    const row = await this.prisma.company_status.findFirst({
      orderBy: { id: 'asc' },
    });
    if (!row) {
      throw new Error('No company_status rows found; cannot create a company');
    }
    return row.id;
  }
}
