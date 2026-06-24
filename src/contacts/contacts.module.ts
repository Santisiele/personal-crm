import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ContactsController } from '@/contacts/contacts.controller';
import {
  CONTACT_REPOSITORY,
  ContactRepository,
} from '@/contacts/domain/contact.repository';
import { PrismaContactRepository } from '@/contacts/infrastructure/persistence/prisma-contact.repository';
import { CreateContact } from '@/contacts/application/create-contact.use-case';

/**
 * Composition root for the contacts context. Binds the ContactRepository port to
 * its Prisma adapter and wires the application service via a factory, keeping the
 * domain and application layers free of any NestJS dependency.
 */
@Module({
  providers: [
    {
      provide: CONTACT_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaContactRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: CreateContact,
      useFactory: (contacts: ContactRepository) => new CreateContact(contacts),
      inject: [CONTACT_REPOSITORY],
    },
  ],
  controllers: [ContactsController],
  exports: [CreateContact, CONTACT_REPOSITORY],
})
export class ContactsModule {}
