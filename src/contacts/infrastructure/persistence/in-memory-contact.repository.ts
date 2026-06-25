import { Contact, ContactId } from '@/contacts/domain/contact';
import { ContactRepository } from '@/contacts/domain/contact.repository';

/**
 * In-memory driven adapter for contacts. Used as a fast, dependency-free
 * substitute for the real persistence adapter in acceptance/unit tests and local
 * development.
 *
 * Owns identity for new contacts via a simple counter, mirroring the database's
 * autoincrement behaviour.
 */
export class InMemoryContactRepository implements ContactRepository {
  private readonly contacts = new Map<ContactId, Contact>();
  private readonly deleted = new Set<ContactId>();
  private sequence = 0;

  save(contact: Contact): Promise<void> {
    if (contact.id === null) {
      this.sequence += 1;
      contact.assignId(String(this.sequence));
    }
    this.contacts.set(contact.id as ContactId, contact);
    return Promise.resolve();
  }

  findById(id: ContactId): Promise<Contact | null> {
    // Soft-deleted contacts stay retrievable by id so historical references
    // remain viewable.
    return Promise.resolve(this.contacts.get(id) ?? null);
  }

  findAll(): Promise<Contact[]> {
    return Promise.resolve(
      [...this.contacts.values()].filter(
        (contact) => !this.deleted.has(contact.id as ContactId),
      ),
    );
  }

  softDelete(id: ContactId, _deletedBy: string): Promise<void> {
    this.deleted.add(id);
    return Promise.resolve();
  }
}
