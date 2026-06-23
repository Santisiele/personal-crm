import { UserRole } from '../../users/domain/user-role';

/**
 * The authenticated principal performing an action. UserRole is treated as a
 * shared kernel concept between the users and tasks contexts.
 */
export interface Actor {
  id: string;
  role: UserRole;
}
