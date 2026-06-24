import {
  TaskAssignment,
  TaskAssignmentId,
} from '@/task-assignments/domain/task-assignment';
import { TaskAssignmentRepository } from '@/task-assignments/domain/task-assignment.repository';

/**
 * In-memory driven adapter for task assignments. Used in acceptance/unit tests
 * and local development. Owns identity for new assignments via a simple counter,
 * mirroring the database's autoincrement behaviour.
 */
export class InMemoryTaskAssignmentRepository implements TaskAssignmentRepository {
  private readonly assignments = new Map<TaskAssignmentId, TaskAssignment>();
  private sequence = 0;

  save(assignment: TaskAssignment): Promise<void> {
    if (assignment.id === null) {
      this.sequence += 1;
      assignment.assignId(String(this.sequence));
    }
    this.assignments.set(assignment.id as TaskAssignmentId, assignment);
    return Promise.resolve();
  }

  findByTaskId(taskId: string): Promise<TaskAssignment[]> {
    const history = [...this.assignments.values()]
      .filter((assignment) => assignment.taskId === taskId)
      // Most-recent first: by assignedAt then id (numeric), descending.
      .sort((a, b) => {
        const byDate = b.assignedAt.getTime() - a.assignedAt.getTime();
        return byDate !== 0 ? byDate : Number(b.id) - Number(a.id);
      });
    return Promise.resolve(history);
  }

  findById(id: TaskAssignmentId): Promise<TaskAssignment | null> {
    return Promise.resolve(this.assignments.get(id) ?? null);
  }
}
