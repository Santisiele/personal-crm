import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { Actor } from '@/shared/domain/actor';
import { UserRole } from '@/users/domain/user-role';
import { Contact } from '@/contacts/domain/contact';
import { CreateContact } from '@/contacts/application/create-contact.use-case';
import { ListContacts } from '@/contacts/application/list-contacts.use-case';
import { ViewContact } from '@/contacts/application/view-contact.use-case';
import { UpdateContact } from '@/contacts/application/update-contact.use-case';
import { DeleteContact } from '@/contacts/application/delete-contact.use-case';
import { ContactNotFoundError } from '@/contacts/domain/contact-not-found.error';
import { InMemoryContactRepository } from '@/contacts/infrastructure/persistence/in-memory-contact.repository';

const feature = loadFeature('specs/contact_management.feature', {
  errors: false,
});

const CONTACT_NAME = 'Jane Doe';
const EMAIL = 'jane@example.com';
const BIRTH = '1990-05-17';

const MISSING_ID = '999999';

const ACTOR: Actor = { id: '42', role: UserRole.USER };

defineFeature(feature, (test) => {
  let contacts: InMemoryContactRepository;
  let createContact: CreateContact;
  let listContacts: ListContacts;
  let viewContact: ViewContact;
  let updateContact: UpdateContact;
  let deleteContact: DeleteContact;
  let created: Contact;
  let listed: Contact[];
  let viewed: Contact;
  let caught: unknown;

  beforeEach(() => {
    contacts = new InMemoryContactRepository();
    createContact = new CreateContact(contacts);
    listContacts = new ListContacts(contacts);
    viewContact = new ViewContact(contacts);
    updateContact = new UpdateContact(contacts);
    deleteContact = new DeleteContact(contacts);
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

  test('A contact is edited', ({ given, when, then }) => {
    givenAContactExists(given);
    when("the contact's name and email are changed", async () => {
      await updateContact.execute({
        contactId: created.id as string,
        contactName: 'Jane Smith',
        email: 'jane.smith@example.com',
      });
    });
    then('the stored contact reflects the changes', async () => {
      const stored = await contacts.findById(created.id as string);
      expect(stored!.contactName).toBe('Jane Smith');
      expect(stored!.email).toBe('jane.smith@example.com');
      expect(stored!.birth).toBe(BIRTH);
    });
  });

  test('A partial edit leaves untouched fields intact', ({
    given,
    when,
    then,
  }) => {
    givenAContactExists(given);
    when("only the contact's email is changed", async () => {
      await updateContact.execute({
        contactId: created.id as string,
        email: 'new@example.com',
      });
    });
    then('the stored contact keeps its original name and birth', async () => {
      const stored = await contacts.findById(created.id as string);
      expect(stored!.contactName).toBe(CONTACT_NAME);
      expect(stored!.email).toBe('new@example.com');
      expect(stored!.birth).toBe(BIRTH);
    });
  });

  test('Editing a contact that does not exist', ({ when, then }) => {
    when('a contact that does not exist is edited', async () => {
      try {
        await updateContact.execute({
          contactId: MISSING_ID,
          contactName: 'Nobody',
        });
      } catch (error) {
        caught = error;
      }
    });
    then('a contact-not-found error is raised', () => {
      expect(caught).toBeInstanceOf(ContactNotFoundError);
    });
  });

  const whenThatContactIsDeleted = (when: DefineStepFunction) => {
    when('that contact is deleted', async () => {
      await deleteContact.execute({
        actor: ACTOR,
        contactId: created.id as string,
      });
    });
  };

  test('A contact is deleted and no longer listed', ({ given, when, then }) => {
    givenAContactExists(given);
    whenThatContactIsDeleted(when);
    then('the contact is not in the listing', async () => {
      listed = await listContacts.execute();
      expect(listed.some((c) => c.id === created.id)).toBe(false);
    });
  });

  test('A deleted contact can still be viewed by id', ({
    given,
    when,
    then,
  }) => {
    givenAContactExists(given);
    whenThatContactIsDeleted(when);
    then('the contact can still be viewed by id', async () => {
      viewed = await viewContact.execute({ contactId: created.id as string });
      expect(viewed.id).toBe(created.id);
      expect(viewed.contactName).toBe(CONTACT_NAME);
    });
  });

  test('Deleting a contact that does not exist', ({ when, then }) => {
    when('a contact that does not exist is deleted', async () => {
      try {
        await deleteContact.execute({ actor: ACTOR, contactId: MISSING_ID });
      } catch (error) {
        caught = error;
      }
    });
    then('a contact-not-found error is raised', () => {
      expect(caught).toBeInstanceOf(ContactNotFoundError);
    });
  });
});
