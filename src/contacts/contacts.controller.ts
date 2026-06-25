import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentActor } from '@/auth/current-actor.decorator';
import type { Actor } from '@/shared/domain/actor';
import { CreateContact } from '@/contacts/application/create-contact.use-case';
import { ListContacts } from '@/contacts/application/list-contacts.use-case';
import { ViewContact } from '@/contacts/application/view-contact.use-case';
import { UpdateContact } from '@/contacts/application/update-contact.use-case';
import { DeleteContact } from '@/contacts/application/delete-contact.use-case';
import { CreateContactDto } from '@/contacts/dto/create-contact.dto';
import { UpdateContactDto } from '@/contacts/dto/update-contact.dto';
import { Contact } from '@/contacts/domain/contact';

@ApiTags('contacts')
@ApiBearerAuth('access-token')
@Controller('contacts')
export class ContactsController {
  constructor(
    private readonly createContact: CreateContact,
    private readonly listContacts: ListContacts,
    private readonly viewContact: ViewContact,
    private readonly updateContact: UpdateContact,
    private readonly deleteContact: DeleteContact,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  @ApiCreatedResponse({
    description: 'Contact created; returns id, name, email and birth.',
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async create(@Body() body: CreateContactDto) {
    const contact = await this.createContact.execute({
      contactName: body.contactName,
      email: body.email,
      birth: body.birth,
    });
    return this.present(contact);
  }

  @Get()
  @ApiOperation({ summary: 'List all contacts' })
  @ApiOkResponse({ description: 'Returns all contacts.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  async findAll() {
    const contacts = await this.listContacts.execute();
    return contacts.map((contact) => this.present(contact));
  }

  @Get(':id')
  @ApiOperation({ summary: 'View a single contact by id' })
  @ApiParam({ name: 'id', description: 'Contact id.' })
  @ApiOkResponse({ description: 'Returns the contact.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 404, description: 'Contact not found.' })
  async findOne(@Param('id') id: string) {
    const contact = await this.viewContact.execute({ contactId: id });
    return this.present(contact);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a contact (partial update)' })
  @ApiParam({ name: 'id', description: 'Contact id.' })
  @ApiOkResponse({ description: 'Returns the updated contact.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 404, description: 'Contact not found.' })
  async update(@Param('id') id: string, @Body() body: UpdateContactDto) {
    const contact = await this.updateContact.execute({
      contactId: id,
      contactName: body.contactName,
      email: body.email,
      birth: body.birth,
    });
    return this.present(contact);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a contact (logical delete)' })
  @ApiParam({ name: 'id', description: 'Contact id.' })
  @ApiNoContentResponse({ description: 'Contact logically deleted.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({ status: 404, description: 'Contact not found.' })
  async remove(
    @Param('id') id: string,
    @CurrentActor() actor: Actor,
  ): Promise<void> {
    await this.deleteContact.execute({ actor, contactId: id });
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
