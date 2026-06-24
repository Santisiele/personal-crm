import { Contact } from '@/contacts/domain/contact';
import { ContactRepository } from '@/contacts/domain/contact.repository';

export interface CreateContactCommand {
  contactName: string;
  email?: string | null;
  birth?: string | null;
}

/**
 * Application service orchestrating contact creation. Depends only on the domain
 * port (Dependency Inversion), so it is agnostic to the persistence strategy.
 * Anyone may create a contact, so there is no actor nor authorization here.
 * Identity is assigned by the repository on save.
 */
export class CreateContact {
  constructor(private readonly contacts: ContactRepository) {}

  async execute(command: CreateContactCommand): Promise<Contact> {
    const contact = Contact.create({
      contactName: command.contactName,
      email: command.email,
      birth: command.birth,
    });
    await this.contacts.save(contact);
    return contact;
  }
}
