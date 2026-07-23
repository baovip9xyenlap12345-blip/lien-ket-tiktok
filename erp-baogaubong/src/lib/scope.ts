// Pham vi du lieu (DataScope) — dung chung cho moi phan he co du lieu theo nguoi phu trach.
// OWN: chi ban ghi minh phu trach hoac minh tao. TEAM: chua co mo hinh to/nhom (GD8) → tam nhu OWN.
// BRANCH: theo chi nhanh cua nguoi dung. ALL: khong gioi han.

export type ScopeUser = { id: number; scope: string; branchId: number | null };

export function scopeWhere(user: ScopeUser): Record<string, unknown> {
  switch (user.scope) {
    case 'ALL':
      return {};
    case 'BRANCH':
      // Chi nhanh null (chua gan) thi that chat ve du lieu cua chinh minh.
      return user.branchId != null
        ? { OR: [{ branchId: user.branchId }, { assignedToId: user.id }, { createdById: user.id }] }
        : { OR: [{ assignedToId: user.id }, { createdById: user.id }] };
    case 'TEAM':
    case 'OWN':
    default:
      return { OR: [{ assignedToId: user.id }, { createdById: user.id }] };
  }
}

/** 1 ban ghi cu the co thuoc pham vi cua user khong (dung cho GET chi tiet/file). */
export function inScope(user: ScopeUser, row: { branchId?: number | null; assignedToId?: number | null; createdById?: number | null }): boolean {
  switch (user.scope) {
    case 'ALL': return true;
    case 'BRANCH':
      if (user.branchId != null && row.branchId === user.branchId) return true;
      return row.assignedToId === user.id || row.createdById === user.id;
    default:
      return row.assignedToId === user.id || row.createdById === user.id;
  }
}
