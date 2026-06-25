import { Actor } from '@/shared/domain/actor';
import { ContactId } from '@/contacts/domain/contact';
import { ContactRepository } from '@/contacts/domain/contact.repository';
import { ContactNotFoundError } from '@/contacts/domain/contact-not-found.error';

export interface DeleteContactCommand {
  actor: Actor;
  contactId: ContactId;
}

/**
 * Application service logically deleting a contact. Depends only on the domain
 * port (Dependency Inversion). Anyone may delete a contact (same stance as
 * creation/editing), so there is no authorization here; a missing contact
 * raises a ContactNotFoundError (→ 404). Deletion is logical: the contact is
 * marked deleted (recording the acting actor) and stays retrievable by id,
 * while dropping out of the listing.
 */
export class DeleteContact {
  constructor(private readonly contacts: ContactRepository) {}

  async execute(command: DeleteContactCommand): Promise<void> {
    const contact = await this.contacts.findById(command.contactId);
    if (!contact) {
      throw new ContactNotFoundError(command.contactId);
    }
    await this.contacts.softDelete(command.contactId, command.actor.id);
  }
}
