import { loadFeature, defineFeature, DefineStepFunction } from 'jest-cucumber';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';
import { Task } from '@/tasks/domain/task';
import { InMemoryTaskRepository } from '@/tasks/infrastructure/persistence/in-memory-task.repository';
import { AccessDeniedError } from '@/tasks/domain/access-denied.error';
import { TaskNotFoundError } from '@/tasks/domain/task-not-found.error';
import { AssignmentStatus } from '@/task-assignments/domain/assignment-status';
import { TaskAssignment } from '@/task-assignments/domain/task-assignment';
import { TaskAssignmentNotFoundError } from '@/task-assignments/domain/task-assignment-not-found.error';
import { InMemoryTaskAssignmentRepository } from '@/task-assignments/infrastructure/persistence/in-memory-task-assignment.repository';
import { ViewAssignmentHistory } from '@/task-assignments/application/view-assignment-history.use-case';
import {
  AssignmentResponse,
  RespondToAssignment,
} from '@/task-assignments/application/respond-to-assignment.use-case';

const feature = loadFeature('specs/task_assignments.feature', {
  errors: false,
});

const USER_ID = 'user-1';
const ANOTHER_USER_ID = 'another-user';
const TASK_ID = 'task-1';

defineFeature(feature, (test) => {
  let tasks: InMemoryTaskRepository;
  let assignments: InMemoryTaskAssignmentRepository;
  let viewHistory: ViewAssignmentHistory;
  let respond: RespondToAssignment;
  let actor: Actor;
  let task: Task;
  let assignment: TaskAssignment;
  let history: TaskAssignment[];
  let denied: boolean;
  let taskNotFound: boolean;
  let assignmentNotFound: boolean;

  beforeEach(() => {
    tasks = new InMemoryTaskRepository();
    assignments = new InMemoryTaskAssignmentRepository();
    viewHistory = new ViewAssignmentHistory(tasks, assignments);
    respond = new RespondToAssignment(assignments);
    denied = false;
    taskNotFound = false;
    assignmentNotFound = false;
  });

  const authenticatedAsUser = (given: DefineStepFunction): void => {
    given('a user is authenticated', () => {
      actor = { id: USER_ID, role: UserRole.USER };
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

  const seedAssignment = async (
    assigneeId: string,
    assignedAt: Date,
  ): Promise<TaskAssignment> => {
    const created = TaskAssignment.create({
      taskId: TASK_ID,
      assigneeId,
      assignedById: ANOTHER_USER_ID,
      assignedAt,
    });
    await assignments.save(created);
    return created;
  };

  const viewsHistory = (when: DefineStepFunction, phrase: string): void => {
    when(phrase, async () => {
      try {
        history = await viewHistory.execute({ actor, taskId: TASK_ID });
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

  const respondsToAssignment = (
    when: DefineStepFunction,
    phrase: string,
    response: AssignmentResponse,
    assignmentIdFn: () => string,
  ): void => {
    when(phrase, async () => {
      try {
        assignment = await respond.execute({
          actor,
          assignmentId: assignmentIdFn(),
          response,
        });
      } catch (error) {
        if (error instanceof AccessDeniedError) {
          denied = true;
        } else if (error instanceof TaskAssignmentNotFoundError) {
          assignmentNotFound = true;
        } else {
          throw error;
        }
      }
    });
  };

  test('An owner views the assignment history of their task', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    theTaskBelongsToThatUser(and);
    and('the task has been assigned twice', async () => {
      await seedAssignment(actor.id, new Date('2026-01-01T00:00:00Z'));
      await seedAssignment(ANOTHER_USER_ID, new Date('2026-02-01T00:00:00Z'));
    });
    viewsHistory(when, 'the user views the assignment history');
    then('the full history is returned most-recent first', () => {
      expect(history).toHaveLength(2);
      expect(history[0].assigneeId).toBe(ANOTHER_USER_ID);
      expect(history[1].assigneeId).toBe(USER_ID);
    });
  });

  test("A user cannot view the history of another user's task", ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    aTaskBelongsToAnotherUser(and);
    viewsHistory(when, 'the user attempts to view the assignment history');
    then('viewing the history is denied', () => {
      expect(denied).toBe(true);
    });
  });

  test('Viewing the history of a task that does not exist', ({
    given,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    viewsHistory(when, 'the user views the history of a missing task');
    then('the task is reported as not found', () => {
      expect(taskNotFound).toBe(true);
    });
  });

  test('The assignee accepts their current assignment', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    and('the user has a pending assignment on a task', async () => {
      assignment = await seedAssignment(actor.id, new Date());
      expect(assignment.status).toBe(AssignmentStatus.PENDING);
    });
    respondsToAssignment(
      when,
      'the assignee accepts the assignment',
      AssignmentResponse.ACCEPT,
      () => assignment.id!,
    );
    then('the assignment status is accepted', async () => {
      expect(assignment.status).toBe(AssignmentStatus.ACCEPTED);
      const reloaded = await assignments.findById(assignment.id!);
      expect(reloaded!.status).toBe(AssignmentStatus.ACCEPTED);
    });
  });

  test('The assignee rejects their current assignment', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    and('the user has a pending assignment on a task', async () => {
      assignment = await seedAssignment(actor.id, new Date());
    });
    respondsToAssignment(
      when,
      'the assignee rejects the assignment',
      AssignmentResponse.REJECT,
      () => assignment.id!,
    );
    then('the assignment status is rejected', async () => {
      expect(assignment.status).toBe(AssignmentStatus.REJECTED);
      const reloaded = await assignments.findById(assignment.id!);
      expect(reloaded!.status).toBe(AssignmentStatus.REJECTED);
    });
  });

  test('A user cannot accept an assignment that is not theirs', ({
    given,
    and,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    let theirs: TaskAssignment;
    and('another user has a pending assignment on a task', async () => {
      theirs = await seedAssignment(ANOTHER_USER_ID, new Date());
    });
    respondsToAssignment(
      when,
      'the user attempts to accept that assignment',
      AssignmentResponse.ACCEPT,
      () => theirs.id!,
    );
    then('acting on the assignment is denied', async () => {
      expect(denied).toBe(true);
      const reloaded = await assignments.findById(theirs.id!);
      expect(reloaded!.status).toBe(AssignmentStatus.PENDING);
    });
  });

  test('Accepting an assignment that does not exist', ({
    given,
    when,
    then,
  }) => {
    authenticatedAsUser(given);
    respondsToAssignment(
      when,
      'the user attempts to accept a missing assignment',
      AssignmentResponse.ACCEPT,
      () => 'does-not-exist',
    );
    then('the assignment is reported as not found', () => {
      expect(assignmentNotFound).toBe(true);
    });
  });
});
