import { describe, it, expect } from 'vitest';
import { PERMISSIONS, ROLE_DEFAULTS, roleHas } from './rbac';

describe('RBAC mac dinh', () => {
  it('moi quyen cua vai tro deu ton tai trong danh muc', () => {
    const codes = new Set(PERMISSIONS.map((p) => p.code));
    for (const def of Object.values(ROLE_DEFAULTS)) {
      for (const p of def.perms) expect(codes.has(p), p).toBe(true);
    }
  });
  it('admin co toan quyen', () => {
    expect(ROLE_DEFAULTS.admin.perms.length).toBe(PERMISSIONS.length);
  });
  it('sale KHONG duoc xem gia von, tai chinh, luong, cai dat', () => {
    for (const p of ['cost.view','finance.view','finance.manage','hr.manage','setting.manage','user.manage','audit.view']) {
      expect(roleHas(ROLE_DEFAULTS.sale.perms, p), p).toBe(false);
    }
  });
  it('kho KHONG xem tai chinh/gia von; ke toan co finance + cost', () => {
    expect(roleHas(ROLE_DEFAULTS.kho.perms, 'finance.view')).toBe(false);
    expect(roleHas(ROLE_DEFAULTS.kho.perms, 'cost.view')).toBe(false);
    expect(roleHas(ROLE_DEFAULTS.ketoan.perms, 'finance.manage')).toBe(true);
    expect(roleHas(ROLE_DEFAULTS.ketoan.perms, 'cost.view')).toBe(true);
  });
});
