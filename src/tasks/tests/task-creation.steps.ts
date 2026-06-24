import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { CreateTask } from '@/tasks/application/create-task.use-case';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';

const feature = loadFeature('specs/task_creation.feature', { errors: false });

const ANOTHER_USER_ID = 'another-user';
const TITLE = 'Call the client';
const DESCRIPTION = 'Follow up about the proposal';

// Sentinel telling the helper to omit assigneeId entirely (vs. passing null).
const OMITTED = Symbol('omitted');

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let createTask: CreateTask;
  let actor: Actor;
  let created: Task | null;
  let denied: boolean;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    createTask = new CreateTask(tasks);
    created = null;
    denied = false;
  });

  const authenticatedAs = (
    given: DefineStepFunction,
    phrase: string,
    role: UserRole,
    id: string,
  ) => {
    given(phrase, () => {
      actor = { id, role };
    });
  };

  const attemptCreate = async (assigneeId: string | null | typeof OMITTED) => {
    try {
      created = await createTask.execute({
        actor,
        title: TITLE,
        description: DESCRIPTION,
        ...(assigneeId === OMITTED ? {} : { assigneeId }),
      });
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        denied = true;
      } else {
        throw error;
      }
    }
  };

  const createsAssignedTo = (
    when: DefineStepFunction,
    phrase: string,
    assigneeId: string | null | typeof OMITTED,
  ) => {
    when(phrase, () => attemptCreate(assigneeId));
  };

  const theTaskIsCreated = (then: DefineStepFunction) => {
    then('the task is created', async () => {
      expect(created).not.toBeNull();
      expect(created!.id).not.toBeNull();
      const stored = await tasks.findById(created!.id as string);
      expect(stored).not.toBeNull();
    });
  };

  const theTaskIsNotCreated = (then: DefineStepFunction) => {
    then('the task is not created', () => {
      expect(denied).toBe(true);
      expect(created).toBeNull();
    });
  };

  test('User creates a task for themselves', ({ given, when, then, and }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    createsAssignedTo(
      when,
      'the user creates a task assigned to themselves',
      'user-1',
    );
    theTaskIsCreated(then);
    and('the task is assigned to the user', () => {
      expect(created!.assigneeId).toBe(actor.id);
    });
  });

  test('User creates a task without specifying an assignee', ({
    given,
    when,
    then,
    and,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    createsAssignedTo(
      when,
      'the user creates a task without specifying an assignee',
      OMITTED,
    );
    theTaskIsCreated(then);
    and('the task is assigned to the user', () => {
      expect(created!.assigneeId).toBe(actor.id);
    });
  });

  test('Administrator creates a task assigned to another user', ({
    given,
    when,
    then,
    and,
  }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    createsAssignedTo(
      when,
      'the administrator creates a task assigned to another user',
      ANOTHER_USER_ID,
    );
    theTaskIsCreated(then);
    and('the task is assigned to that other user', () => {
      expect(created!.assigneeId).toBe(ANOTHER_USER_ID);
    });
  });

  test('Creator creates an unassigned task', ({ given, when, then, and }) => {
    authenticatedAs(
      given,
      'a creator is authenticated',
      UserRole.CREATOR,
      'creator-1',
    );
    createsAssignedTo(when, 'the creator creates an unassigned task', null);
    theTaskIsCreated(then);
    and('the task has no assignee', () => {
      expect(created!.assigneeId).toBeNull();
    });
  });

  test('User cannot create a task assigned to another user', ({
    given,
    when,
    then,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    createsAssignedTo(
      when,
      'the user attempts to create a task assigned to another user',
      ANOTHER_USER_ID,
    );
    theTaskIsNotCreated(then);
  });

  test('User cannot create an unassigned task', ({ given, when, then }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    createsAssignedTo(
      when,
      'the user attempts to create an unassigned task',
      null,
    );
    theTaskIsNotCreated(then);
  });
});
