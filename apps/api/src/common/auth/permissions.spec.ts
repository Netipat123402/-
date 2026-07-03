import { resolveScope } from './permissions.guard';
import type { AuthenticatedUser } from './authenticated-user';

function userWith(perms: AuthenticatedUser['permissions']): AuthenticatedUser {
  return {
    id: 'u1',
    email: 'a@b.c',
    fullName: 'Test',
    roles: ['x'],
    branchId: 'b1',
    teamId: 't1',
    permissions: perms,
    tokenVersion: 0,
  };
}

describe('resolveScope (RBAC — Phase 7 §1)', () => {
  it('คืน scope กว้างสุดเมื่อมีหลาย scope', () => {
    const user = userWith([
      { resource: 'property', action: 'read', scope: 'own' },
      { resource: 'property', action: 'read', scope: 'branch' },
    ]);
    expect(resolveScope(user, 'property', 'read')).toBe('branch');
  });

  it('คืน null เมื่อไม่มีสิทธิ์', () => {
    const user = userWith([{ resource: 'lead', action: 'read', scope: 'own' }]);
    expect(resolveScope(user, 'property', 'read')).toBeNull();
  });

  it('แยกตาม action — read กับ approve คนละ scope', () => {
    const user = userWith([
      { resource: 'property', action: 'read', scope: 'all' },
      { resource: 'property', action: 'approve', scope: 'team' },
    ]);
    expect(resolveScope(user, 'property', 'read')).toBe('all');
    expect(resolveScope(user, 'property', 'approve')).toBe('team');
  });

  it('agent scope = own', () => {
    const user = userWith([{ resource: 'property', action: 'update', scope: 'own' }]);
    expect(resolveScope(user, 'property', 'update')).toBe('own');
  });
});
