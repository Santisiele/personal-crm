import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { CreateTask } from '@/tasks/application/create-task.use-case';
import { EditTask } from '@/tasks/application/edit-task.use-case';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';

const feature = loadFeature('specs/task_company_link.feature', {
  errors: false,
});

const COMPANY_ID = 'company-7';
const CONTACT_ID = 'contact-3';
const TITLE = 'Prepare pitch';
const DESCRIPTION = 'For the quarterly review';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let createTask: CreateTask;
  let editTask: EditTask;
  let actor: Actor;
  let created: Task;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    createTask = new CreateTask(tasks);
    editTask = new EditTask(tasks);
  });

  const authenticatedAsUser = (given: DefineStepFunction) => {
    given('a user is authenticated', () => {
      actor = { id: 'user-1', role: UserRole.USER };
    });
  };

  test('User creates a task associated with a company', ({
    given,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    when('the user creates a task associated with a company', async () => {
      created = await createTask.execute({
        actor,
        title: TITLE,
        description: DESCRIPTION,
        companyId: COMPANY_ID,
      });
    });
    then('the task is created linked to that company', async () => {
      const stored = await tasks.findById(created.id!);
      expect(stored!.companyId).toBe(COMPANY_ID);
    });
  });

  test('User creates a task without a company', ({ given, when, then }) => {
    authenticatedAsUser(given);
    when('the user creates a task without a company', async () => {
      created = await createTask.execute({
        actor,
        title: TITLE,
        description: DESCRIPTION,
      });
    });
    then('the task has no company', async () => {
      const stored = await tasks.findById(created.id!);
      expect(stored!.companyId).toBeNull();
    });
  });

  test('User creates a task about a company and one of its contacts', ({
    given,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    when('the user creates a task for a company and a contact', async () => {
      created = await createTask.execute({
        actor,
        title: TITLE,
        description: DESCRIPTION,
        companyId: COMPANY_ID,
        contactId: CONTACT_ID,
      });
    });
    then('the task is created linked to that company and contact', async () => {
      const stored = await tasks.findById(created.id!);
      expect(stored!.companyId).toBe(COMPANY_ID);
      expect(stored!.contactId).toBe(CONTACT_ID);
    });
  });

  test('User links an existing task to a company and contact by editing it', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    and('the user owns a task with no company', async () => {
      created = await createTask.execute({
        actor,
        title: TITLE,
        description: DESCRIPTION,
      });
    });
    when('the user edits the task to set a company and a contact', async () => {
      await editTask.execute({
        actor,
        taskId: created.id!,
        companyId: COMPANY_ID,
        contactId: CONTACT_ID,
      });
    });
    then('the task ends up linked to that company and contact', async () => {
      const stored = await tasks.findById(created.id!);
      expect(stored!.companyId).toBe(COMPANY_ID);
      expect(stored!.contactId).toBe(CONTACT_ID);
    });
  });
});
