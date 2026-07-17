import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { LogTaskActivity } from '@/task-activities/application/log-task-activity.use-case';
import { ViewActivityLog } from '@/task-activities/application/view-activity-log.use-case';
import { ViewAllActivity } from '@/task-activities/application/view-all-activity.use-case';
import { TaskActivity } from '@/task-activities/domain/task-activity';
import { InMemoryTaskActivityRepository } from '@/task-activities/infrastructure/persistence/in-memory-task-activity.repository';

const feature = loadFeature('specs/task_activity.feature', { errors: false });

const USER_ID = 'user-1';
const ANOTHER_USER_ID = 'another-user';
const TASK_ID = 'task-1';
const ACTION_TYPE = 'CALL';
const STATUS = 'DONE';
const ACTIVITY_DATE = '2026-06-24';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let activities: InMemoryTaskActivityRepository;
  let logTaskActivity: LogTaskActivity;
  let viewActivityLog: ViewActivityLog;
  let viewAllActivity: ViewAllActivity;
  let actor: Actor;
  let task: Task;
  let log: TaskActivity[];
  let stored: boolean;
  let denied: boolean;
  let taskNotFound: boolean;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    activities = new InMemoryTaskActivityRepository();
    logTaskActivity = new LogTaskActivity(tasks, activities);
    viewActivityLog = new ViewActivityLog(tasks, activities);
    viewAllActivity = new ViewAllActivity(activities);
    stored = false;
    denied = false;
    taskNotFound = false;
  });

  const authenticatedAsUser = (given: DefineStepFunction): void => {
    given('a user is authenticated', () => {
      actor = { id: USER_ID, role: UserRole.USER };
    });
  };

  const authenticatedAsAdmin = (given: DefineStepFunction): void => {
    given('an administrator is authenticated', () => {
      actor = { id: 'admin-1', role: UserRole.ADMIN };
    });
  };

  const theTaskBelongsToThatUser = (and: DefineStepFunction): void => {
    and('the task belongs to that user', async () => {
      task = Task.rehydrate({ id: TASK_ID, ownerId: actor.id });
      await tasks.save(task);
    });
  };

  const aTaskBelongsToAnotherUser = (and: DefineStepFunction): void => {
    and('a task belongs to another user', async () => {
      task = Task.rehydrate({ id: TASK_ID, ownerId: ANOTHER_USER_ID });
      await tasks.save(task);
    });
  };

  const seedActivity = async (activityDate: string): Promise<void> => {
    await seedActivityOnTask(TASK_ID, activityDate);
  };

  const seedActivityOnTask = async (
    taskId: string,
    activityDate: string,
  ): Promise<void> => {
    await activities.save(
      TaskActivity.create({
        taskId,
        authorId: actor.id,
        actionType: ACTION_TYPE,
        status: STATUS,
        activityDate,
      }),
    );
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

  const viewsLog = (when: DefineStepFunction, phrase: string): void => {
    when(phrase, async () => {
      try {
        log = await viewActivityLog.execute({ actor, taskId: TASK_ID });
      } catch (error) {
        if (error instanceof AccessDeniedError) {
          denied = true;
        } else if (error instanceof TaskNotFoundError) {
          taskNotFound = true;
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

  test('An owner views the activity log of their task', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    theTaskBelongsToThatUser(and);
    and('the task has two logged activities', async () => {
      await seedActivity('2026-01-01');
      await seedActivity('2026-02-01');
    });
    viewsLog(when, 'the user views the activity log');
    then('the full activity log is returned most-recent first', () => {
      expect(log).toHaveLength(2);
      expect(log[0].activityDate).toBe('2026-02-01');
      expect(log[1].activityDate).toBe('2026-01-01');
    });
  });

  test("A user cannot view the activity log of another user's task", ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    aTaskBelongsToAnotherUser(and);
    viewsLog(when, 'the user attempts to view the activity log');
    then('viewing the activity log is denied', () => {
      expect(denied).toBe(true);
    });
  });

  test('Viewing the activity log of a task that does not exist', ({
    given,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    viewsLog(when, 'the user views the activity log of a missing task');
    then('the task is reported as not found', () => {
      expect(taskNotFound).toBe(true);
    });
  });

  test('A privileged actor views all activity across every task', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsAdmin(given);
    and('there are activities logged on several tasks', async () => {
      await seedActivityOnTask('task-1', '2026-01-01');
      await seedActivityOnTask('task-2', '2026-02-01');
    });
    when('the administrator views all activity', async () => {
      log = await viewAllActivity.execute({ actor });
    });
    then('every activity is returned most-recent first', () => {
      expect(log).toHaveLength(2);
      expect(log[0].taskId).toBe('task-2');
      expect(log[0].activityDate).toBe('2026-02-01');
      expect(log[1].taskId).toBe('task-1');
    });
  });

  test('A plain user cannot view all activity', ({ given, when, then }) => {
    authenticatedAsUser(given);
    when('the user attempts to view all activity', async () => {
      try {
        log = await viewAllActivity.execute({ actor });
      } catch (error) {
        if (error instanceof AccessDeniedError) {
          denied = true;
        } else {
          throw error;
        }
      }
    });
    then('viewing the activity log is denied', () => {
      expect(denied).toBe(true);
    });
  });
});
