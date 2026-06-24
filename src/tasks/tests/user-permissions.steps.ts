import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { ViewTask } from '@/tasks/application/view-task.use-case';
import { ReassignTask } from '@/tasks/application/reassign-task.use-case';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';

const feature = loadFeature('specs/user_permissions.feature', {
  errors: false,
});

const ANOTHER_USER_ID = 'another-user';
const NEW_ASSIGNEE_ID = 'new-assignee';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let viewTask: ViewTask;
  let reassignTask: ReassignTask;
  let actor: Actor;
  let task: Task;
  let accessGranted: boolean;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    viewTask = new ViewTask(tasks);
    reassignTask = new ReassignTask(tasks);
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

  const aTaskBelongsToAnotherUser = (and: DefineStepFunction) => {
    and('a task belongs to another user', async () => {
      task = Task.rehydrate({ id: 'task-1', ownerId: ANOTHER_USER_ID });
      await tasks.save(task);
    });
  };

  const theTaskBelongsToThatUser = (and: DefineStepFunction) => {
    and('the task belongs to that user', async () => {
      task = Task.rehydrate({ id: 'task-1', ownerId: actor.id });
      await tasks.save(task);
    });
  };

  const requestsTheTask = (when: DefineStepFunction) => {
    when('requests the task', async () => {
      try {
        await viewTask.execute({ actor, taskId: task.id! });
        accessGranted = true;
      } catch (error) {
        if (error instanceof AccessDeniedError) {
          accessGranted = false;
        } else {
          throw error;
        }
      }
    });
  };

  const accessIsGranted = (then: DefineStepFunction) => {
    then('access is granted', () => {
      expect(accessGranted).toBe(true);
    });
  };

  const accessIsDenied = (then: DefineStepFunction) => {
    then('access is denied', () => {
      expect(accessGranted).toBe(false);
    });
  };

  test('Administrator can view any task', ({ given, and, when, then }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    aTaskBelongsToAnotherUser(and);
    requestsTheTask(when);
    accessIsGranted(then);
  });

  test('Creator can view any task', ({ given, and, when, then }) => {
    authenticatedAs(
      given,
      'a creator is authenticated',
      UserRole.CREATOR,
      'creator-1',
    );
    aTaskBelongsToAnotherUser(and);
    requestsTheTask(when);
    accessIsGranted(then);
  });

  test('User can view own task', ({ given, and, when, then }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    theTaskBelongsToThatUser(and);
    requestsTheTask(when);
    accessIsGranted(then);
  });

  test("User cannot view another user's task", ({ given, and, when, then }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    aTaskBelongsToAnotherUser(and);
    requestsTheTask(when);
    accessIsDenied(then);
  });

  const attemptsToReassign = (when: DefineStepFunction, phrase: string) => {
    when(phrase, async () => {
      try {
        await reassignTask.execute({
          actor,
          taskId: task.id!,
          newAssigneeId: NEW_ASSIGNEE_ID,
        });
        accessGranted = true;
      } catch (error) {
        if (error instanceof AccessDeniedError) {
          accessGranted = false;
        } else {
          throw error;
        }
      }
    });
  };

  test('User can reassign own task', ({ given, and, when, then }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    theTaskBelongsToThatUser(and);
    attemptsToReassign(when, 'reassigns the task');
    then('the reassignment is successful', async () => {
      expect(accessGranted).toBe(true);
      const stored = await tasks.findById(task.id!);
      expect(stored!.assigneeId).toBe(NEW_ASSIGNEE_ID);
    });
  });

  test("User cannot reassign another user's task", ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    aTaskBelongsToAnotherUser(and);
    attemptsToReassign(when, 'attempts to reassign the task');
    accessIsDenied(then);
  });
});
