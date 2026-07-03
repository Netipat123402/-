/**
 * ผู้ใช้ที่ผ่าน authentication แล้ว — แนบไว้ที่ req.user (Phase 4 §3)
 */
export type Scope = 'own' | 'team' | 'branch' | 'all';

export interface AuthPermission {
  resource: string;
  action: string;
  scope: Scope;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  branchId: string | null;
  teamId: string | null;
  permissions: AuthPermission[];
  tokenVersion: number; // MR-22: เทียบกับ tv ใน access token (เพิกถอนทันที)
}

/** ลำดับความกว้างของ scope (มาก = เห็นข้อมูลกว้างกว่า) */
export const SCOPE_RANK: Record<Scope, number> = {
  own: 1,
  team: 2,
  branch: 3,
  all: 4,
};
