import { UserAccessPolicy } from '@/users/domain/user-access-policy';
import { UserRole } from '@/users/domain/user-role';
import { Actor } from '@/shared/domain/actor';

describe('UserAccessPolicy', () => {
  const policy = new UserAccessPolicy();
  const actorWith = (id: string, role: UserRole): Actor => ({ id, role });

  describe('canList', () => {
    it('allows privileged roles to list users', () => {
      expect(policy.canList(actorWith('1', UserRole.ADMIN))).toBe(true);
      expect(policy.canList(actorWith('1', UserRole.CREATOR))).toBe(true);
    });

    it('forbids a plain user from listing users', () => {
      expect(policy.canList(actorWith('1', UserRole.USER))).toBe(false);
    });
  });

  describe('canView', () => {
    it('allows a privileged actor to view any user', () => {
      expect(policy.canView(actorWith('1', UserRole.ADMIN), '2')).toBe(true);
    });

    it('allows a plain user to view themselves', () => {
      expect(policy.canView(actorWith('1', UserRole.USER), '1')).toBe(true);
    });

    it('forbids a plain user from viewing another user', () => {
      expect(policy.canView(actorWith('1', UserRole.USER), '2')).toBe(false);
    });
  });
});
