import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { CreateTask } from '@/tasks/application/create-task.use-case';
import { EditTask } from '@/tasks/application/edit-task.use-case';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';

const feature = loadFeature('specs/task_editing.feature', { errors: false });

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let createTask: CreateTask;
  let editTask: EditTask;
  let actor: Actor;
  let task: Task;
  let denied: boolean;
  let notFound: boolean;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    createTask = new CreateTask(tasks);
    editTask = new EditTask(tasks);
    denied = false;
    notFound = false;
  });

  const authenticatedAsUser = (given: DefineStepFunction) => {
    given('a user is authenticated', () => {
      actor = { id: 'user-1', role: UserRole.USER };
    });
  };

  const ownsATaskDueOn = (and: DefineStepFunction) => {
    and(/^that user owns a task due on (.*)$/, async (date: string) => {
      task = await createTask.execute({
        actor,
        title: 'Original',
        description: 'Original description',
        dueDate: date,
      });
    });
  };

  test('The owner reschedules a task', ({ given, and, when, then }) => {
    authenticatedAsUser(given);
    ownsATaskDueOn(and);

    when(
      /^the owner edits the task due date to (.*)$/,
      async (date: string) => {
        await editTask.execute({ actor, taskId: task.id!, dueDate: date });
      },
    );

    then(/^the task is due on (.*)$/, async (date: string) => {
      const stored = await tasks.findById(task.id!);
      expect(stored!.dueDate).toBe(date);
    });
  });

  test('The owner edits the title and description', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    ownsATaskDueOn(and);

    when(
      /^the owner edits the task title to "(.*)"$/,
      async (title: string) => {
        await editTask.execute({ actor, taskId: task.id!, title });
      },
    );

    then(/^the task title is "(.*)"$/, async (title: string) => {
      const stored = await tasks.findById(task.id!);
      expect(stored!.title).toBe(title);
    });

    and(/^the task is still due on (.*)$/, async (date: string) => {
      const stored = await tasks.findById(task.id!);
      expect(stored!.dueDate).toBe(date);
    });
  });

  test('The owner clears the due date', ({ given, and, when, then }) => {
    authenticatedAsUser(given);
    ownsATaskDueOn(and);

    when('the owner clears the task due date', async () => {
      await editTask.execute({ actor, taskId: task.id!, dueDate: null });
    });

    then('the task has no due date', async () => {
      const stored = await tasks.findById(task.id!);
      expect(stored!.dueDate).toBeNull();
    });
  });

  test('A stranger cannot edit the task', ({ given, and, when, then }) => {
    authenticatedAsUser(given);

    and('a task belongs to another user', async () => {
      const owner: Actor = { id: 'other-owner', role: UserRole.USER };
      task = await createTask.execute({
        actor: owner,
        title: 'Original',
        description: 'Original description',
        dueDate: '2026-01-10',
      });
    });

    when(
      /^the user edits that task title to "(.*)"$/,
      async (title: string) => {
        try {
          await editTask.execute({ actor, taskId: task.id!, title });
        } catch (error) {
          if (error instanceof AccessDeniedError) {
            denied = true;
          } else {
            throw error;
          }
        }
      },
    );

    then('editing is denied', async () => {
      expect(denied).toBe(true);
      const stored = await tasks.findById(task.id!);
      expect(stored!.title).toBe('Original');
    });
  });

  test('Editing a task that does not exist is reported as not found', ({
    given,
    when,
    then,
  }) => {
    authenticatedAsUser(given);

    when('the user edits a task that does not exist', async () => {
      try {
        await editTask.execute({ actor, taskId: '999999', title: 'X' });
      } catch (error) {
        if (error instanceof TaskNotFoundError) {
          notFound = true;
        } else {
          throw error;
        }
      }
    });

    then('the task is reported as not found', () => {
      expect(notFound).toBe(true);
    });
  });
});
