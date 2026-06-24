import { Body, Controller, Post } from '@nestjs/common';
import { CreateContact } from '@/contacts/application/create-contact.use-case';
import { CreateContactDto } from '@/contacts/dto/create-contact.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly createContact: CreateContact) {}

  @Post()
  async create(@Body() body: CreateContactDto) {
    const contact = await this.createContact.execute({
      contactName: body.contactName,
      email: body.email,
      birth: body.birth,
    });
    return {
      id: contact.id,
      contactName: contact.contactName,
      email: contact.email,
      birth: contact.birth,
    };
  }
}
