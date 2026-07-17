export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  CREATOR = 'CREATOR',
}

/** The seniority of each role, low to high, for hierarchy comparisons. */
export const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.ADMIN]: 1,
  [UserRole.CREATOR]: 2,
};

/** Whether role `a` is strictly more senior than role `b`. */
export function outranks(a: UserRole, b: UserRole): boolean {
  return ROLE_RANK[a] > ROLE_RANK[b];
}
