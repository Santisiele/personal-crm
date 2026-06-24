import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { Contact } from '@/contacts/domain/contact';
import { CreateContact } from '@/contacts/application/create-contact.use-case';
import { InMemoryContactRepository } from '@/contacts/infrastructure/persistence/in-memory-contact.repository';

const feature = loadFeature('specs/contact_management.feature', {
  errors: false,
});

const CONTACT_NAME = 'Jane Doe';
const EMAIL = 'jane@example.com';
const BIRTH = '1990-05-17';

defineFeature(feature, (test) => {
  let contacts: InMemoryContactRepository;
  let createContact: CreateContact;
  let created: Contact;

  beforeEach(() => {
    contacts = new InMemoryContactRepository();
    createContact = new CreateContact(contacts);
  });

  const aContactIsCreated = (when: DefineStepFunction) => {
    when('a contact is created', async () => {
      created = await createContact.execute({
        contactName: CONTACT_NAME,
        email: EMAIL,
        birth: BIRTH,
      });
    });
  };

  const theContactIsStored = (then: DefineStepFunction) => {
    then('the contact is stored', async () => {
      expect(created.id).not.toBeNull();
      const stored = await contacts.findById(created.id as string);
      expect(stored).not.toBeNull();
      expect(stored!.contactName).toBe(CONTACT_NAME);
      expect(stored!.email).toBe(EMAIL);
      expect(stored!.birth).toBe(BIRTH);
    });
  };

  test('A contact is created', ({ when, then }) => {
    aContactIsCreated(when);
    theContactIsStored(then);
  });
});
