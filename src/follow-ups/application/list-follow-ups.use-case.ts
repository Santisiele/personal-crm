import { Actor } from '@/shared/domain/actor';
import { CompanyRepository } from '@/companies/domain/company.repository';
import { ContactRepository } from '@/contacts/domain/contact.repository';
import { TaskAccessPolicy } from '@/tasks/domain/task-access-policy';
import { TaskStatus } from '@/tasks/domain/task-status';
import { TaskRepository } from '@/tasks/domain/task.repository';
import { TaskActivity } from '@/task-activities/domain/task-activity';
import { TaskActivityRepository } from '@/task-activities/domain/task-activity.repository';
import { UserRepository } from '@/users/domain/user.repository';

export interface ListFollowUpsQuery {
  actor: Actor;
}

/** The latest thing done on a task. */
export interface LastAction {
  date: string;
  description: string | null;
  by: string;
}

/** One follow-up row: a task with its latest action and its next step. */
export interface FollowUpView {
  taskId: string;
  company: string | null;
  contact: string | null;
  lastAction: LastAction | null;
  /** The next-action date: the last activity's, falling back to the due date. */
  nextActionDate: string | null;
  /** The next action: the last activity's, falling back to the task title. */
  nextAction: string;
  /** Who will do it — the task's current assignee. */
  willDo: string | null;
  status: TaskStatus;
}

/**
 * Application service for the follow-up board: one row per task the actor may
 * see (owner, assignee or privileged — the same visibility as the task list),
 * enriched with its company/contact names, its latest activity and its next
 * step, ordered by the next-action date (soonest first).
 *
 * Note on visibility: the latest-activity summary is attached to any task the
 * actor can see in their list — including tasks merely assigned to them. This is
 * deliberately more permissive than the per-task activity LOG (owner/privileged
 * only): a follow-up summary of a task you are responsible for is yours to see.
 *
 * The join is done here from whole-table reads (small catalogs for a personal
 * CRM); activity of tasks the actor cannot see is never attached, so nothing
 * leaks across the visibility boundary.
 */
export class ListFollowUps {
  private readonly policy = new TaskAccessPolicy();

  constructor(
    private readonly tasks: TaskRepository,
    private readonly activities: TaskActivityRepository,
    private readonly companies: CompanyRepository,
    private readonly contacts: ContactRepository,
    private readonly users: UserRepository,
  ) {}

  async execute(query: ListFollowUpsQuery): Promise<FollowUpView[]> {
    const allTasks = await this.tasks.findAll();
    const visible = allTasks.filter((task) =>
      this.policy.isVisibleInList(query.actor, task),
    );

    const [allActivities, allCompanies, allContacts, allUsers] =
      await Promise.all([
        this.activities.findAll(),
        this.companies.findAll(),
        this.contacts.findAll(),
        this.users.findAll(),
      ]);

    // Activities come most-recent first, so the first one seen for a task is its
    // latest.
    const latestByTask = new Map<string, TaskActivity>();
    for (const activity of allActivities) {
      if (!latestByTask.has(activity.taskId)) {
        latestByTask.set(activity.taskId, activity);
      }
    }
    const companyName = new Map(
      allCompanies.map((c) => [c.id as string, c.companyName]),
    );
    const contactName = new Map(
      allContacts.map((c) => [c.id as string, c.contactName]),
    );
    const userName = new Map(allUsers.map((u) => [u.id as string, u.name]));
    const nameOf = (id: string | null): string | null =>
      id ? (userName.get(id) ?? `#${id}`) : null;

    const rows: FollowUpView[] = visible.map((task) => {
      const last = latestByTask.get(task.id as string);
      return {
        taskId: task.id as string,
        company: task.companyId
          ? (companyName.get(task.companyId) ?? `#${task.companyId}`)
          : null,
        contact: task.contactId
          ? (contactName.get(task.contactId) ?? `#${task.contactId}`)
          : null,
        lastAction: last
          ? {
              date: last.activityDate,
              description: last.description,
              by: nameOf(last.authorId) as string,
            }
          : null,
        nextActionDate: last?.nextActionDate ?? task.dueDate,
        nextAction: last?.nextAction ?? task.title,
        willDo: nameOf(task.assigneeId),
        status: task.status,
      };
    });

    // Soonest next action first; rows without a next-action date go last.
    rows.sort((a, b) => {
      if (a.nextActionDate === b.nextActionDate) {
        return 0;
      }
      if (!a.nextActionDate) {
        return 1;
      }
      if (!b.nextActionDate) {
        return -1;
      }
      return a.nextActionDate < b.nextActionDate ? -1 : 1;
    });
    return rows;
  }
}
