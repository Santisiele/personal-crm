import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { ArchiveTask } from '@/tasks/application/archive-task.use-case';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';

const feature = loadFeature('specs/task_archiving.feature', { errors: false });

const ANOTHER_USER_ID = 'another-user';
const REASON = 'Duplicated';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let archiveTask: ArchiveTask;
  let actor: Actor;
  let task: Task;
  let archived: boolean;
  let denied: boolean;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    archiveTask = new ArchiveTask(tasks);
    archived = false;
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

  const theTaskBelongsToThatUser = (and: DefineStepFunction) => {
    and('the task belongs to that user', async () => {
      task = Task.rehydrate({ id: 'task-1', ownerId: actor.id });
      await tasks.save(task);
    });
  };

  const aTaskBelongsToAnotherUser = (and: DefineStepFunction) => {
    and('a task belongs to another user', async () => {
      task = Task.rehydrate({ id: 'task-1', ownerId: ANOTHER_USER_ID });
      await tasks.save(task);
    });
  };

  const archivesTheTask = (when: DefineStepFunction, phrase: string) => {
    when(phrase, async () => {
      try {
        await archiveTask.execute({ actor, taskId: task.id!, reason: REASON });
        archived = true;
      } catch (error) {
        if (error instanceof AccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });
  };

  const theTaskIsArchived = (then: DefineStepFunction) => {
    then('the task is archived', async () => {
      expect(archived).toBe(true);
      expect(await tasks.findById(task.id!)).toBeNull();
    });
  };

  test('Owner archives their task', ({ given, and, when, then }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    theTaskBelongsToThatUser(and);
    archivesTheTask(when, 'the user archives the task with a reason');
    theTaskIsArchived(then);
    and('the task can no longer be viewed', async () => {
      expect(await tasks.findById(task.id!)).toBeNull();
    });
  });

  test("An administrator archives another user's task", ({
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
    aTaskBelongsToAnotherUser(and);
    archivesTheTask(when, 'the administrator archives the task with a reason');
    theTaskIsArchived(then);
  });

  test("A user cannot archive another user's task", ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, 'user-1');
    aTaskBelongsToAnotherUser(and);
    archivesTheTask(when, 'the user attempts to archive the task');
    then('archiving is denied', () => {
      expect(denied).toBe(true);
      expect(archived).toBe(false);
    });
  });
});
