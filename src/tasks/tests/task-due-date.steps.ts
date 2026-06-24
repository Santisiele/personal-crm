import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { CreateTask } from '@/tasks/application/create-task.use-case';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';

const feature = loadFeature('specs/task_due_date.feature', { errors: false });

const DUE_DATE = '2026-12-31';
const TITLE = 'Submit report';
const DESCRIPTION = 'Quarterly numbers';

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

  test('User creates a task with a due date', ({ given, when, then }) => {
    authenticatedAsUser(given);
    when('the user creates a task with a due date', async () => {
      created = await createTask.execute({
        actor,
        title: TITLE,
        description: DESCRIPTION,
        dueDate: DUE_DATE,
      });
    });
    then('the task is created with that due date', async () => {
      const stored = await tasks.findById(created.id!);
      expect(stored!.dueDate).toBe(DUE_DATE);
    });
  });

  test('User creates a task without a due date', ({ given, when, then }) => {
    authenticatedAsUser(given);
    when('the user creates a task without a due date', async () => {
      created = await createTask.execute({
        actor,
        title: TITLE,
        description: DESCRIPTION,
      });
    });
    then('the task has no due date', async () => {
      const stored = await tasks.findById(created.id!);
      expect(stored!.dueDate).toBeNull();
    });
  });
});
