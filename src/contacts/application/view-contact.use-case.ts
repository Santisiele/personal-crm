import { Contact, ContactId } from '@/contacts/domain/contact';
import { ContactRepository } from '@/contacts/domain/contact.repository';
import { ContactNotFoundError } from '@/contacts/domain/contact-not-found.error';

export interface ViewContactQuery {
  contactId: ContactId;
}

/**
 * Application service reading a single contact. Depends only on the domain port
 * (Dependency Inversion). Anyone may view a contact (same stance as creation),
 * so there is no actor nor authorization here; a missing contact raises a
 * ContactNotFoundError (→ 404).
 */
export class ViewContact {
  constructor(private readonly contacts: ContactRepository) {}

  async execute(query: ViewContactQuery): Promise<Contact> {
    const contact = await this.contacts.findById(query.contactId);
    if (!contact) {
      throw new ContactNotFoundError(query.contactId);
    }
    return contact;
  }
}
