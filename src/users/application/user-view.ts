import { UserId } from '@/users/domain/user';
import { UserRole } from '@/users/domain/user-role';
import { User } from '@/users/domain/user';

/**
 * A read model of a user that is safe to expose at the boundary. It deliberately
 * omits the password hash so that no query path can ever leak credentials.
 */
export interface UserView {
  id: UserId;
  name: string;
  role: UserRole;
}

/** Projects a User aggregate onto its safe, hash-free view. */
export function toUserView(user: User): UserView {
  return { id: user.id as UserId, name: user.name, role: user.role };
}
