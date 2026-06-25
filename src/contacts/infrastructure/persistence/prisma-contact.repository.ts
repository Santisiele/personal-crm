import { PrismaClient } from '@prisma/client';
import { Contact, ContactId } from '@/contacts/domain/contact';
import { ContactRepository } from '@/contacts/domain/contact.repository';

/**
 * Prisma-backed driven adapter implementing the ContactRepository port.
 *
 * Translates between the domain model (string id, ISO 'YYYY-MM-DD' birth) and
 * the relational schema (BigInt autoincrement id, DATE column). The `birth`
 * date is stored as a `Date` and read back as the date portion of its ISO
 * string, dropping any time component the DATE column does not carry.
 *
 * `save` only handles brand-new contacts (no id) for now, mirroring the single
 * creation use case; identity is assigned on insert.
 */
export class PrismaContactRepository implements ContactRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(contact: Contact): Promise<void> {
    if (contact.id === null) {
      const created = await this.prisma.contact.create({
        data: {
          contact_name: contact.contactName,
          email: contact.email,
          birth: contact.birth ? new Date(contact.birth) : null,
        },
      });
      contact.assignId(created.id.toString());
      return;
    }

    await this.prisma.contact.update({
      where: { id: BigInt(contact.id) },
      data: {
        contact_name: contact.contactName,
        email: contact.email,
        birth: contact.birth ? new Date(contact.birth) : null,
      },
    });
  }

  async findById(id: ContactId): Promise<Contact | null> {
    const row = await this.prisma.contact.findUnique({
      where: { id: BigInt(id) },
    });
    if (!row) {
      return null;
    }
    return this.toDomain(row);
  }

  async findAll(): Promise<Contact[]> {
    const rows = await this.prisma.contact.findMany({
      where: { deleted_at: null },
      orderBy: { id: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async softDelete(id: ContactId, deletedBy: string): Promise<void> {
    await this.prisma.contact.update({
      where: { id: BigInt(id) },
      data: { deleted_at: new Date(), deleted_by: BigInt(deletedBy) },
    });
  }

  private toDomain(row: {
    id: bigint;
    contact_name: string;
    email: string | null;
    birth: Date | null;
  }): Contact {
    return Contact.rehydrate({
      id: row.id.toString(),
      contactName: row.contact_name,
      email: row.email,
      birth: row.birth ? row.birth.toISOString().slice(0, 10) : null,
    });
  }
}
