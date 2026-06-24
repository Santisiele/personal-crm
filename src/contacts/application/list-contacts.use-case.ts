import { Contact } from '@/contacts/domain/contact';
import { ContactRepository } from '@/contacts/domain/contact.repository';

/**
 * Application service listing every contact. Depends only on the domain port
 * (Dependency Inversion). Like contact creation, anyone may list contacts, so
 * there is no actor nor authorization here.
 */
export class ListContacts {
  constructor(private readonly contacts: ContactRepository) {}

  async execute(): Promise<Contact[]> {
    return this.contacts.findAll();
  }
}
