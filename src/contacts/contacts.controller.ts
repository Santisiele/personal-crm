import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateContact } from '@/contacts/application/create-contact.use-case';
import { ListContacts } from '@/contacts/application/list-contacts.use-case';
import { ViewContact } from '@/contacts/application/view-contact.use-case';
import { CreateContactDto } from '@/contacts/dto/create-contact.dto';
import { Contact } from '@/contacts/domain/contact';

@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly createContact: CreateContact,
    private readonly listContacts: ListContacts,
    private readonly viewContact: ViewContact,
  ) {}

  @Post()
  async create(@Body() body: CreateContactDto) {
    const contact = await this.createContact.execute({
      contactName: body.contactName,
      email: body.email,
      birth: body.birth,
    });
    return this.present(contact);
  }

  @Get()
  async findAll() {
    const contacts = await this.listContacts.execute();
    return contacts.map((contact) => this.present(contact));
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const contact = await this.viewContact.execute({ contactId: id });
    return this.present(contact);
  }

  private present(contact: Contact) {
    return {
      id: contact.id,
      contactName: contact.contactName,
      email: contact.email,
      birth: contact.birth,
    };
  }
}
