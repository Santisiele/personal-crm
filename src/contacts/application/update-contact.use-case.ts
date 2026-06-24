import { Contact, ContactId } from '@/contacts/domain/contact';
import { ContactRepository } from '@/contacts/domain/contact.repository';
import { ContactNotFoundError } from '@/contacts/domain/contact-not-found.error';

export interface UpdateContactCommand {
  contactId: ContactId;
  contactName?: string;
  email?: string | null;
  birth?: string | null;
}

/**
 * Application service editing an existing contact. Depends only on the domain
 * port (Dependency Inversion). The edit is partial: only the provided
 * attributes change. Anyone may edit a contact (same stance as creation), so
 * there is no actor nor authorization here; a missing contact raises a
 * ContactNotFoundError (→ 404). The aggregate applies the change and is then
 * persisted via the existing identity-aware save path.
 */
export class UpdateContact {
  constructor(private readonly contacts: ContactRepository) {}

  async execute(command: UpdateContactCommand): Promise<Contact> {
    const contact = await this.contacts.findById(command.contactId);
    if (!contact) {
      throw new ContactNotFoundError(command.contactId);
    }
    contact.update({
      contactName: command.contactName,
      email: command.email,
      birth: command.birth,
    });
    await this.contacts.save(contact);
    return contact;
  }
}
