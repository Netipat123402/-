import { PropertyRepository } from './property.repository';
import { IMPOSSIBLE_ID } from '../../common/auth/scope.util';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

const repo = new PropertyRepository({} as never);

function user(partial: Partial<AuthenticatedUser>): AuthenticatedUser {
  return {
    id: 'u1', email: 'a@b.c', fullName: 'A', roles: [],
    branchId: null, teamId: null, permissions: [], tokenVersion: 0, ...partial,
  };
}

describe('PropertyRepository.scopeWhere — null-leak guard (#8)', () => {
  it('branch scope + มี branchId → กรองตาม branchId', () => {
    const w = repo.scopeWhere(user({ branchId: 'b1' }), 'branch') as Record<string, unknown>;
    expect(w.branchId).toBe('b1');
    expect(w.deletedAt).toBeNull();
  });

  it('branch scope + ไม่มี branchId → match ไม่ได้ (กันเห็น record สาขา null ทั้งหมด)', () => {
    const w = repo.scopeWhere(user({ branchId: null }), 'branch') as Record<string, unknown>;
    expect(w.id).toBe(IMPOSSIBLE_ID);
    expect(w.branchId).toBeUndefined();
  });

  it('team scope + ไม่มี teamId → match ไม่ได้', () => {
    const w = repo.scopeWhere(user({ teamId: null }), 'team') as Record<string, unknown>;
    expect(w.id).toBe(IMPOSSIBLE_ID);
  });

  it('team scope + มี teamId → กรองตาม assignedTo.teamId', () => {
    const w = repo.scopeWhere(user({ teamId: 't1' }), 'team') as Record<string, unknown>;
    expect(w.assignedTo).toEqual({ teamId: 't1' });
  });

  it('own scope → กรองตาม assignedToId', () => {
    const w = repo.scopeWhere(user({ id: 'me' }), 'own') as Record<string, unknown>;
    expect(w.assignedToId).toBe('me');
  });

  it('all scope → เห็นทั้งหมด (เฉพาะ deletedAt null)', () => {
    const w = repo.scopeWhere(user({}), 'all') as Record<string, unknown>;
    expect(w).toEqual({ deletedAt: null });
  });
});
