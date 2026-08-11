import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { TaskActivity } from '@/task-activities/domain/task-activity';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';
import { InMemoryTaskActivityRepository } from '@/task-activities/infrastructure/persistence/in-memory-task-activity.repository';
import { InMemoryCompanyRepository } from '@/companies/infrastructure/persistence/in-memory-company.repository';
import { InMemoryContactRepository } from '@/contacts/infrastructure/persistence/in-memory-contact.repository';
import { InMemoryUserRepository } from '@/users/infrastructure/persistence/in-memory-user.repository';
import {
  FollowUpView,
  ListFollowUps,
} from '@/follow-ups/application/list-follow-ups.use-case';

const feature = loadFeature('specs/follow_up.feature', { errors: false });

const USER_ID = 'user-1';
const OTHER_ID = 'other-user';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let activities: InMemoryTaskActivityRepository;
  let listFollowUps: ListFollowUps;
  let actor: Actor;
  let rows: FollowUpView[];

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    activities = new InMemoryTaskActivityRepository();
    listFollowUps = new ListFollowUps(
      tasks,
      activities,
      new InMemoryCompanyRepository(),
      new InMemoryContactRepository(),
      new InMemoryUserRepository(),
    );
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

  const seedTask = async (props: {
    ownerId: string;
    title?: string;
    dueDate?: string | null;
  }): Promise<Task> => {
    const task = Task.create({
      ownerId: props.ownerId,
      title: props.title ?? 'A task',
      description: 'x',
      assigneeId: props.ownerId,
      dueDate: props.dueDate ?? null,
    });
    await tasks.save(task);
    return task;
  };

  const viewsTheBoard = (when: DefineStepFunction, phrase: string) => {
    when(phrase, async () => {
      rows = await listFollowUps.execute({ actor });
    });
  };

  test('The board lists visible tasks ordered by next action, soonest first', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, USER_ID);
    and(
      'the user owns a task due 2026-03-01 and another due 2026-01-15',
      async () => {
        await seedTask({ ownerId: USER_ID, dueDate: '2026-03-01' });
        await seedTask({ ownerId: USER_ID, dueDate: '2026-01-15' });
      },
    );
    viewsTheBoard(when, 'the user views the follow-up board');
    then('two rows are returned, the 2026-01-15 one first', () => {
      expect(rows).toHaveLength(2);
      expect(rows[0].nextActionDate).toBe('2026-01-15');
      expect(rows[1].nextActionDate).toBe('2026-03-01');
    });
  });

  test("A row falls back to the task's due date and title without activity", ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, USER_ID);
    and(
      'the user owns a task titled "Call the client" due 2026-05-10 with no activity',
      async () => {
        await seedTask({
          ownerId: USER_ID,
          title: 'Call the client',
          dueDate: '2026-05-10',
        });
      },
    );
    viewsTheBoard(when, 'the user views the follow-up board');
    then('the row\'s next action is "Call the client" on 2026-05-10', () => {
      expect(rows[0].nextAction).toBe('Call the client');
      expect(rows[0].nextActionDate).toBe('2026-05-10');
      expect(rows[0].lastAction).toBeNull();
    });
  });

  test("A logged activity's next step drives the row", ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, USER_ID);
    and(
      'the user owns a task with an activity planning to meet on 2026-06-20',
      async () => {
        const task = await seedTask({
          ownerId: USER_ID,
          dueDate: '2026-05-01',
        });
        await activities.save(
          TaskActivity.create({
            taskId: task.id!,
            authorId: USER_ID,
            actionType: 'CALL',
            status: 'DONE',
            activityDate: '2026-05-02',
            nextAction: 'Meet at their office',
            nextActionDate: '2026-06-20',
          }),
        );
      },
    );
    viewsTheBoard(when, 'the user views the follow-up board');
    then("the row's next action reflects that plan", () => {
      expect(rows[0].nextAction).toBe('Meet at their office');
      expect(rows[0].nextActionDate).toBe('2026-06-20');
      expect(rows[0].lastAction?.date).toBe('2026-05-02');
    });
  });

  test("A user does not see another user's task on the board", ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAs(given, 'a user is authenticated', UserRole.USER, USER_ID);
    and('a task belongs to another user', async () => {
      await seedTask({ ownerId: OTHER_ID });
    });
    viewsTheBoard(when, 'the user views the follow-up board');
    then('the board has no rows', () => {
      expect(rows).toHaveLength(0);
    });
  });

  test('A privileged actor sees every task on the board', ({
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
    and(
      'a task belongs to one user and another to a different user',
      async () => {
        await seedTask({ ownerId: USER_ID, dueDate: '2026-02-01' });
        await seedTask({ ownerId: OTHER_ID, dueDate: '2026-02-02' });
      },
    );
    viewsTheBoard(when, 'the administrator views the follow-up board');
    then('both tasks appear on the board', () => {
      expect(rows).toHaveLength(2);
    });
  });
});
