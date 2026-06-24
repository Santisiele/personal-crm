import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { CreateTask } from '@/tasks/application/create-task.use-case';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';

const feature = loadFeature('specs/task_company_link.feature', {
  errors: false,
});

const COMPANY_ID = 'company-7';
const TITLE = 'Prepare pitch';
const DESCRIPTION = 'For the quarterly review';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let createTask: CreateTask;
  let actor: Actor;
  let created: Task;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    createTask = new CreateTask(tasks);
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
});
