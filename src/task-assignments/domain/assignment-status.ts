/**
 * The lifecycle state of a single task assignment. Kept as a small enum in the
 * domain (its descriptions double as the `assignment_status.description` lookup
 * values resolved by the Prisma adapter). An assignment starts PENDING; the
 * assignee may ACCEPT or REJECT it.
 */
export enum AssignmentStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}
