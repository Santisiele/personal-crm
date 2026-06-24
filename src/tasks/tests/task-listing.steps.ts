import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { ListTasks } from '@/tasks/application/list-tasks.use-case';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';

const feature = loadFeature('specs/task_listing.feature', { errors: false });

const ANOTHER_USER_ID = 'another-user';
const COMPANY_ID = 'company-1';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let listTasks: ListTasks;
  let actor: Actor;
  let listed: Task[];
  let ownedId: string;
  let assignedId: string;
  let otherId: string;
  let companyTaskId: string;
  let noCompanyTaskId: string;
  let archivedId: string;
  let seq: number;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    listTasks = new ListTasks(tasks);
    seq = 0;
  });

  const save = async (props: {
    ownerId: string;
    assigneeId?: string | null;
    companyId?: string | null;
  }): Promise<string> => {
    seq += 1;
    const task = Task.rehydrate({ id: `task-${seq}`, ...props });
    await tasks.save(task);
    return task.id!;
  };

  const authenticatedAsUser = (given: DefineStepFunction) => {
    given('a user is authenticated', () => {
      actor = { id: 'user-1', role: UserRole.USER };
    });
  };

  test('A user lists only the tasks they can see', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    and('the user owns a task', async () => {
      ownedId = await save({ ownerId: actor.id });
    });
    and('another task is assigned to the user', async () => {
      assignedId = await save({
        ownerId: ANOTHER_USER_ID,
        assigneeId: actor.id,
      });
    });
    and('a task belongs to another user', async () => {
      otherId = await save({ ownerId: ANOTHER_USER_ID });
    });
    when('the user lists their tasks', async () => {
      listed = await listTasks.execute({ actor });
    });
    then('the listing contains the owned and assigned tasks', () => {
      const ids = listed.map((t) => t.id);
      expect(ids).toContain(ownedId);
      expect(ids).toContain(assignedId);
    });
    and("the listing excludes the other user's task", () => {
      expect(listed.map((t) => t.id)).not.toContain(otherId);
    });
  });

  test('A privileged user lists every task', ({ given, and, when, then }) => {
    given('an administrator is authenticated', () => {
      actor = { id: 'admin-1', role: UserRole.ADMIN };
    });
    and('several tasks exist across different users', async () => {
      await save({ ownerId: 'user-a' });
      await save({ ownerId: 'user-b' });
      await save({ ownerId: 'user-c' });
    });
    when('the administrator lists tasks', async () => {
      listed = await listTasks.execute({ actor });
    });
    then('the listing contains every task', () => {
      expect(listed).toHaveLength(3);
    });
  });

  test('A user filters their tasks by company', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    and('the user owns a task linked to a company', async () => {
      companyTaskId = await save({ ownerId: actor.id, companyId: COMPANY_ID });
    });
    and('the user owns a task with no company', async () => {
      noCompanyTaskId = await save({ ownerId: actor.id });
    });
    when('the user lists tasks for that company', async () => {
      listed = await listTasks.execute({
        actor,
        filter: { companyId: COMPANY_ID },
      });
    });
    then("the listing contains only the company's task", () => {
      const ids = listed.map((t) => t.id);
      expect(ids).toContain(companyTaskId);
      expect(ids).not.toContain(noCompanyTaskId);
    });
  });

  test('Archived tasks are excluded from the listing', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    and('the user owns a task', async () => {
      ownedId = await save({ ownerId: actor.id });
    });
    and('the user owns an archived task', async () => {
      archivedId = await save({ ownerId: actor.id });
      await tasks.archive(archivedId, 'gone', actor.id);
    });
    when('the user lists their tasks', async () => {
      listed = await listTasks.execute({ actor });
    });
    then('the listing excludes the archived task', () => {
      const ids = listed.map((t) => t.id);
      expect(ids).toContain(ownedId);
      expect(ids).not.toContain(archivedId);
    });
  });
});
