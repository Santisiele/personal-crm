import { Role, RoleId } from '@/users/domain/role';
import { RoleRepository } from '@/users/domain/role.repository';

/**
 * In-memory driven adapter for roles. Used as a fast, dependency-free substitute
 * for the real persistence adapter in acceptance/unit tests and local
 * development.
 *
 * Owns identity for new roles via a simple counter, mirroring the database's
 * autoincrement behaviour.
 */
export class InMemoryRoleRepository implements RoleRepository {
  private readonly roles = new Map<RoleId, Role>();
  private sequence = 0;

  save(role: Role): Promise<void> {
    if (role.id === null) {
      this.sequence += 1;
      role.assignId(String(this.sequence));
    }
    this.roles.set(role.id as RoleId, role);
    return Promise.resolve();
  }

  findAll(): Promise<Role[]> {
    return Promise.resolve([...this.roles.values()]);
  }

  findByDescription(description: string): Promise<Role | null> {
    for (const role of this.roles.values()) {
      if (role.description === description) {
        return Promise.resolve(role);
      }
    }
    return Promise.resolve(null);
  }
}
