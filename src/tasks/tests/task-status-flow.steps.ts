import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { TaskStatus } from '@/tasks/domain/task-status';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { CreateTask } from '@/tasks/application/create-task.use-case';
import { ChangeTaskStatus } from '@/tasks/application/change-task-status.use-case';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';

const feature = loadFeature('specs/task_status_flow.feature', {
  errors: false,
});

const ANOTHER_USER_ID = 'another-user';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let createTask: CreateTask;
  let changeStatus: ChangeTaskStatus;
  let actor: Actor;
  let task: Task;
  let denied: boolean;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    createTask = new CreateTask(tasks);
    changeStatus = new ChangeTaskStatus(tasks);
    denied = false;
  });

  const authenticatedAsUser = (given: DefineStepFunction) => {
    given('a user is authenticated', () => {
      actor = { id: 'user-1', role: UserRole.USER };
    });
  };

  const transitionTo = async (status: TaskStatus) => {
    try {
      await changeStatus.execute({ actor, taskId: task.id!, status });
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        denied = true;
      } else {
        throw error;
      }
    }
  };

  test('A new task starts in the pending status', ({ given, when, then }) => {
    authenticatedAsUser(given);
    when('the user creates a task', async () => {
      task = await createTask.execute({
        actor,
        title: 'Fresh task',
        description: 'no status set',
      });
    });
    then('the task status is pending', () => {
      expect(task.status).toBe(TaskStatus.PENDING);
    });
  });

  test('Owner moves their task through the status flow', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    and('the task belongs to that user', async () => {
      task = Task.rehydrate({ id: 'task-1', ownerId: actor.id });
      await tasks.save(task);
    });
    when('the user changes the task status to in progress', () =>
      transitionTo(TaskStatus.IN_PROGRESS),
    );
    then('the task status is in progress', async () => {
      const stored = await tasks.findById(task.id!);
      expect(stored!.status).toBe(TaskStatus.IN_PROGRESS);
    });
  });

  test('Assignee can change the status of a task assigned to them', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    and('a task is assigned to that user', async () => {
      task = Task.rehydrate({
        id: 'task-1',
        ownerId: ANOTHER_USER_ID,
        assigneeId: actor.id,
      });
      await tasks.save(task);
    });
    when('the user changes the task status to done', () =>
      transitionTo(TaskStatus.DONE),
    );
    then('the task status is done', async () => {
      const stored = await tasks.findById(task.id!);
      expect(stored!.status).toBe(TaskStatus.DONE);
    });
  });

  test("A user cannot change the status of someone else's task", ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    and('a task belongs to another user', async () => {
      task = Task.rehydrate({ id: 'task-1', ownerId: ANOTHER_USER_ID });
      await tasks.save(task);
    });
    when('the user attempts to change the task status', () =>
      transitionTo(TaskStatus.DONE),
    );
    then('changing the status is denied', () => {
      expect(denied).toBe(true);
    });
  });
});
