import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { Contact } from '@/contacts/domain/contact';
import { CreateContact } from '@/contacts/application/create-contact.use-case';
import { ListContacts } from '@/contacts/application/list-contacts.use-case';
import { ViewContact } from '@/contacts/application/view-contact.use-case';
import { ContactNotFoundError } from '@/contacts/domain/contact-not-found.error';
import { InMemoryContactRepository } from '@/contacts/infrastructure/persistence/in-memory-contact.repository';

const feature = loadFeature('specs/contact_management.feature', {
  errors: false,
});

const CONTACT_NAME = 'Jane Doe';
const EMAIL = 'jane@example.com';
const BIRTH = '1990-05-17';

const MISSING_ID = '999999';

defineFeature(feature, (test) => {
  let contacts: InMemoryContactRepository;
  let createContact: CreateContact;
  let listContacts: ListContacts;
  let viewContact: ViewContact;
  let created: Contact;
  let listed: Contact[];
  let viewed: Contact;
  let caught: unknown;

  beforeEach(() => {
    contacts = new InMemoryContactRepository();
    createContact = new CreateContact(contacts);
    listContacts = new ListContacts(contacts);
    viewContact = new ViewContact(contacts);
    caught = undefined;
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

  const givenAContactExists = (given: DefineStepFunction) => {
    given('a contact exists', async () => {
      created = await createContact.execute({
        contactName: CONTACT_NAME,
        email: EMAIL,
        birth: BIRTH,
      });
    });
  };

  test('A contact is created', ({ when, then }) => {
    aContactIsCreated(when);
    theContactIsStored(then);
  });

  test('Contacts are listed', ({ given, when, then }) => {
    given('two contacts exist', async () => {
      await createContact.execute({ contactName: 'Jane Doe' });
      await createContact.execute({ contactName: 'John Roe' });
    });
    when('all contacts are listed', async () => {
      listed = await listContacts.execute();
    });
    then('both contacts are returned', () => {
      expect(listed).toHaveLength(2);
      const names = listed.map((c) => c.contactName).sort();
      expect(names).toEqual(['Jane Doe', 'John Roe']);
    });
  });

  test('A single contact is viewed', ({ given, when, then }) => {
    givenAContactExists(given);
    when('that contact is viewed', async () => {
      viewed = await viewContact.execute({ contactId: created.id as string });
    });
    then('its details are returned', () => {
      expect(viewed.id).toBe(created.id);
      expect(viewed.contactName).toBe(CONTACT_NAME);
      expect(viewed.email).toBe(EMAIL);
      expect(viewed.birth).toBe(BIRTH);
    });
  });

  test('Viewing a contact that does not exist', ({ when, then }) => {
    when('a contact that does not exist is viewed', async () => {
      try {
        await viewContact.execute({ contactId: MISSING_ID });
      } catch (error) {
        caught = error;
      }
    });
    then('a contact-not-found error is raised', () => {
      expect(caught).toBeInstanceOf(ContactNotFoundError);
    });
  });
});
