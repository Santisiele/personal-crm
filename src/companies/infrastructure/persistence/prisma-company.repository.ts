import { PrismaClient } from '@prisma/client';
import { Company, CompanyId } from '@/companies/domain/company';
import { CompanyRepository } from '@/companies/domain/company.repository';
import { CompanyStatusNotFoundError } from '@/companies/domain/company-status-not-found.error';

/**
 * Prisma-backed driven adapter implementing the CompanyRepository port.
 *
 * Translates between the domain model (string id, owner, status as a
 * `company_status` description) and the relational schema (BigInt autoincrement
 * id, `status_id` FK). The mapping is:
 *
 *  - `ownerId` maps to `company.created_by`.
 *  - `status` (a description) maps to `company.status_id`, resolved against the
 *    `company_status` lookup.
 *
 * `save` dispatches on identity: a company with no id is brand-new (INSERT); a
 * company with an id is an existing one being edited or transitioned (UPDATE).
 * When a brand-new company carries no explicit status, we fall back to the
 * lowest-id `company_status` as a sane default, preserving the original
 * behaviour.
 */
export class PrismaCompanyRepository implements CompanyRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(company: Company): Promise<void> {
    if (company.id === null) {
      await this.create(company);
    } else {
      await this.update(company, company.id);
    }
  }

  private async create(company: Company): Promise<void> {
    const created = await this.prisma.company.create({
      data: {
        company_name: company.companyName,
        cuit: company.cuit,
        brand: company.brand,
        product: company.product,
        origin: company.origin,
        created_by: BigInt(company.ownerId),
        status_id:
          company.status !== null
            ? await this.statusIdByDescription(company.status)
            : await this.defaultCompanyStatusId(),
      },
    });
    company.assignId(created.id.toString());
  }

  private async update(company: Company, id: CompanyId): Promise<void> {
    await this.prisma.company.update({
      where: { id: BigInt(id) },
      data: {
        company_name: company.companyName,
        cuit: company.cuit,
        brand: company.brand,
        product: company.product,
        origin: company.origin,
        // A persisted company always has a resolved status; only update the FK
        // when the aggregate carries an explicit description.
        ...(company.status !== null
          ? { status_id: await this.statusIdByDescription(company.status) }
          : {}),
      },
    });
  }

  async findById(id: CompanyId): Promise<Company | null> {
    const row = await this.prisma.company.findUnique({
      where: { id: BigInt(id) },
      include: { company_status: true },
    });
    if (!row) {
      return null;
    }
    return this.toDomain(row);
  }

  async findAll(): Promise<Company[]> {
    const rows = await this.prisma.company.findMany({
      include: { company_status: true },
      orderBy: { id: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: {
    id: bigint;
    created_by: bigint;
    company_name: string;
    cuit: string | null;
    brand: string | null;
    product: string | null;
    origin: string | null;
    company_status: { description: string } | null;
  }): Company {
    return Company.rehydrate({
      id: row.id.toString(),
      ownerId: row.created_by.toString(),
      companyName: row.company_name,
      cuit: row.cuit,
      brand: row.brand,
      product: row.product,
      origin: row.origin,
      status: row.company_status?.description ?? null,
    });
  }

  private async statusIdByDescription(description: string): Promise<bigint> {
    const row = await this.prisma.company_status.findFirst({
      where: { description },
    });
    if (!row) {
      throw new CompanyStatusNotFoundError(description);
    }
    return row.id;
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
