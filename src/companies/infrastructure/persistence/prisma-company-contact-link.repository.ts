import { PrismaClient } from '@prisma/client';
import { CompanyContactLink } from '@/companies/domain/company-contact-link';
import { CompanyContactLinkRepository } from '@/companies/domain/company-contact-link.repository';

/**
 * Prisma-backed driven adapter implementing the CompanyContactLinkRepository
 * port. Maps the link aggregate to a `contact_x_company` row; identity is
 * assigned on insert.
 */
export class PrismaCompanyContactLinkRepository implements CompanyContactLinkRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(link: CompanyContactLink): Promise<void> {
    if (link.id === null) {
      const created = await this.prisma.contact_x_company.create({
        data: {
          company_id: BigInt(link.companyId),
          contact_id: BigInt(link.contactId),
          role_in_company: link.roleInCompany,
          phone: link.phone,
        },
      });
      link.assignId(created.id.toString());
    }
  }
}
