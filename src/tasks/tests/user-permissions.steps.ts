import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { ViewTask } from '@/tasks/application/view-task.use-case';
import { ReassignTask } from '@/tasks/application/reassign-task.use-case';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';
import { User } from '@/users/domain/user';
import { InMemoryUserRepository } from '@/users/infrastructure/persistence/in-memory-user.repository';

const feature = loadFeature('specs/user_permissions.feature', {
  errors: false,
});

const ANOTHER_USER_ID = 'another-user';
const NEW_ASSIGNEE_ID = 'new-assignee';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let users: InMemoryUserRepository;
  let viewTask: ViewTask;
  let reassignTask: ReassignTask;
  let actor: Actor;
  let task: Task;
  let accessGranted: boolean;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    users = new InMemoryUserRepository();
    viewTask = new ViewTask(tasks);
    reassignTask = new ReassignTask(tasks, users);
  });

  // Persists a user with a chosen role and returns its repository-assigned id,
  // so a task can be assigned to someone of a specific rank.
  const persistUser = async (name: string, role: UserRole): Promise<string> => {
    const user = User.create({ name, role, passwordHash: 'hashed' });
    await users.save(user);
    return user.id!;
  };

  // A task owned by an unrelated user and currently assigned to `assigneeId`,
  // so authorization turns on the assignee's rank rather than ownership.
  const aTaskAssignedTo = (
    and: DefineStepFunction,
    phrase: string,
    role: UserRole,
  ) => {
    and(phrase, async () => {
      const assigneeId = await persistUser(`Assignee ${role}`, role);
      task = Task.rehydrate({
        id: 'task-1',
        ownerId: 'some-other-owner',
        assigneeId,
      });
      await tasks.save(task);
    });
  };

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

  const reassignmentIsSuccessful = (then: DefineStepFunction) => {
    then('the reassignment is successful', async () => {
      expect(accessGranted).toBe(true);
      const stored = await tasks.findById(task.id!);
      expect(stored!.assigneeId).toBe(NEW_ASSIGNEE_ID);
    });
  };

  test('An administrator reassigns a task held by a plain user', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    aTaskAssignedTo(and, 'a task is assigned to a plain user', UserRole.USER);
    attemptsToReassign(when, 'reassigns the task');
    reassignmentIsSuccessful(then);
  });

  test('An administrator cannot reassign a task held by another administrator', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(
      given,
      'an administrator is authenticated',
      UserRole.ADMIN,
      'admin-1',
    );
    aTaskAssignedTo(
      and,
      'a task is assigned to another administrator',
      UserRole.ADMIN,
    );
    attemptsToReassign(when, 'attempts to reassign the task');
    accessIsDenied(then);
  });

  test('A creator reassigns a task held by an administrator', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(
      given,
      'a creator is authenticated',
      UserRole.CREATOR,
      'creator-1',
    );
    aTaskAssignedTo(
      and,
      'a task is assigned to an administrator',
      UserRole.ADMIN,
    );
    attemptsToReassign(when, 'reassigns the task');
    reassignmentIsSuccessful(then);
  });
});
