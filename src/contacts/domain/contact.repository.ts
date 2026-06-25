import { Contact, ContactId } from '@/contacts/domain/contact';

/**
 * Driven port for contact persistence. Implemented by adapters (in-memory,
 * Prisma, ...).
 */
export interface ContactRepository {
  save(contact: Contact): Promise<void>;
  findById(id: ContactId): Promise<Contact | null>;
  findAll(): Promise<Contact[]>;
  /**
   * Logically deletes a contact: records `deleted_at`/`deleted_by` and never
   * removes the row. A soft-deleted contact is excluded from `findAll` but stays
   * retrievable by `findById`, so historical references remain viewable.
   */
  softDelete(id: ContactId, deletedBy: string): Promise<void>;
}

export const CONTACT_REPOSITORY = Symbol('ContactRepository');
