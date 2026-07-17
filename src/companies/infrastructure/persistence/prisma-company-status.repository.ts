import { PrismaClient } from '@prisma/client';
import {
  CompanyStatus,
  CompanyStatusId,
} from '@/companies/domain/company-status';
import { CompanyStatusRepository } from '@/companies/domain/company-status.repository';

/**
 * Prisma-backed driven adapter implementing the CompanyStatusRepository port.
 *
 * Writes and reads the `company_status` catalogue. Translates between the domain
 * model (string id) and the relational schema (BigInt autoincrement id), exactly
 * as the PrismaCompanyRepository does for its own identities.
 */
export class PrismaCompanyStatusRepository implements CompanyStatusRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(status: CompanyStatus): Promise<void> {
    const created = await this.prisma.company_status.create({
      data: { description: status.description },
    });
    status.assignId(created.id.toString());
  }

  async findAll(): Promise<CompanyStatus[]> {
    const rows = await this.prisma.company_status.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: CompanyStatusId): Promise<CompanyStatus | null> {
    const row = await this.prisma.company_status.findFirst({
      where: { id: BigInt(id), deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByDescription(description: string): Promise<CompanyStatus | null> {
    const row = await this.prisma.company_status.findFirst({
      where: { description, deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async softDelete(id: CompanyStatusId, deletedBy: string): Promise<void> {
    await this.prisma.company_status.update({
      where: { id: BigInt(id) },
      data: { deleted_at: new Date(), deleted_by: BigInt(deletedBy) },
    });
  }

  private toDomain(row: { id: bigint; description: string }): CompanyStatus {
    return CompanyStatus.rehydrate({
      id: row.id.toString(),
      description: row.description,
    });
  }
}
