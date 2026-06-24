import { Contact, ContactId } from '@/contacts/domain/contact';

/**
 * Driven port for contact persistence. Implemented by adapters (in-memory,
 * Prisma, ...).
 */
export interface ContactRepository {
  save(contact: Contact): Promise<void>;
  findById(id: ContactId): Promise<Contact | null>;
  findAll(): Promise<Contact[]>;
}

export const CONTACT_REPOSITORY = Symbol('ContactRepository');
