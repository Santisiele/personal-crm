import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { LogTaskActivity } from '@/task-activities/application/log-task-activity.use-case';
import { InMemoryTaskActivityRepository } from '@/task-activities/infrastructure/persistence/in-memory-task-activity.repository';

const feature = loadFeature('specs/task_activity.feature', { errors: false });

const ANOTHER_USER_ID = 'another-user';
const ACTION_TYPE = 'CALL';
const STATUS = 'DONE';
const ACTIVITY_DATE = '2026-06-24';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let activities: InMemoryTaskActivityRepository;
  let logTaskActivity: LogTaskActivity;
  let actor: Actor;
  let task: Task;
  let stored: boolean;
  let denied: boolean;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    activities = new InMemoryTaskActivityRepository();
    logTaskActivity = new LogTaskActivity(tasks, activities);
    stored = false;
    denied = false;
  });

  const authenticatedAsUser = (given: DefineStepFunction): void => {
    given('a user is authenticated', () => {
      actor = { id: 'user-1', role: UserRole.USER };
    });
  };

  const theTaskBelongsToThatUser = (and: DefineStepFunction): void => {
    and('the task belongs to that user', async () => {
      task = Task.rehydrate({ id: 'task-1', ownerId: actor.id });
      await tasks.save(task);
    });
  };

  const aTaskBelongsToAnotherUser = (and: DefineStepFunction): void => {
    and('a task belongs to another user', async () => {
      task = Task.rehydrate({ id: 'task-1', ownerId: ANOTHER_USER_ID });
      await tasks.save(task);
    });
  };

  const logsTheActivity = (when: DefineStepFunction, phrase: string): void => {
    when(phrase, async () => {
      try {
        await logTaskActivity.execute({
          actor,
          taskId: task.id!,
          actionType: ACTION_TYPE,
          status: STATUS,
          activityDate: ACTIVITY_DATE,
        });
        stored = true;
      } catch (error) {
        if (error instanceof AccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });
  };

  test('An owner logs an activity on their task', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    theTaskBelongsToThatUser(and);
    logsTheActivity(when, 'the user logs an activity on the task');
    then('the activity is stored', () => {
      expect(stored).toBe(true);
      const saved = activities.all();
      expect(saved).toHaveLength(1);
      expect(saved[0].id).not.toBeNull();
      expect(saved[0].taskId).toBe(task.id);
      expect(saved[0].authorId).toBe(actor.id);
      expect(saved[0].actionType).toBe(ACTION_TYPE);
      expect(saved[0].status).toBe(STATUS);
      expect(saved[0].activityDate).toBe(ACTIVITY_DATE);
    });
  });

  test("A user cannot log an activity on another user's task", ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    aTaskBelongsToAnotherUser(and);
    logsTheActivity(when, 'the user attempts to log an activity on the task');
    then('logging is denied', () => {
      expect(denied).toBe(true);
      expect(stored).toBe(false);
      expect(activities.all()).toHaveLength(0);
    });
  });
});
