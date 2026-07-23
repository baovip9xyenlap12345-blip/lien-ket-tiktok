// Danh muc quyen (module.hanh_dong) — nguon chuan cho seed va kiem tra
export const PERMISSIONS: { code: string; name: string }[] = [
  { code: 'dashboard.view', name: 'Xem tổng quan' },
  { code: 'user.manage', name: 'Quản lý tài khoản' },
  { code: 'role.manage', name: 'Quản lý phân quyền' },
  { code: 'setting.manage', name: 'Quản lý cài đặt' },
  { code: 'org.manage', name: 'Quản lý chi nhánh/kho' },
  { code: 'audit.view', name: 'Xem nhật ký thao tác' },
  // Cac phan he sau (GD2+) khai bao truoc de gan quyen:
  { code: 'catalog.view', name: 'Xem sản phẩm' },
  { code: 'catalog.manage', name: 'Quản lý sản phẩm' },
  { code: 'partner.view', name: 'Xem đối tác' },
  { code: 'partner.manage', name: 'Quản lý đối tác' },
  { code: 'sales.view', name: 'Xem bán hàng' },
  { code: 'sales.manage', name: 'Tạo/sửa báo giá, đơn' },
  { code: 'sales.approve', name: 'Duyệt chiết khấu/công nợ vượt mức' },
  { code: 'inventory.view', name: 'Xem kho' },
  { code: 'inventory.manage', name: 'Nghiệp vụ kho' },
  { code: 'finance.view', name: 'Xem thu chi/công nợ' },
  { code: 'finance.approve', name: 'Duyệt phiếu chi/mở khóa sổ' },
  { code: 'finance.manage', name: 'Nghiệp vụ thu chi' },
  { code: 'cost.view', name: 'Xem giá vốn/lợi nhuận' },
  { code: 'production.view', name: 'Xem sản xuất' },
  { code: 'production.manage', name: 'Nghiệp vụ sản xuất' },
  { code: 'hr.manage', name: 'Quản lý nhân sự/lương' },
  { code: 'report.view', name: 'Xem báo cáo' },
];

export const ROLE_DEFAULTS: Record<string, { name: string; perms: string[] }> = {
  admin: { name: 'Super Admin', perms: PERMISSIONS.map((p) => p.code) },
  sale: {
    name: 'Sale',
    perms: ['dashboard.view','catalog.view','partner.view','partner.manage','sales.view','sales.manage'],
  },
  ketoan: {
    name: 'Kế toán',
    perms: ['dashboard.view','catalog.view','partner.view','sales.view','inventory.view',
      'finance.view','finance.manage','cost.view','report.view','audit.view'],
  },
  kho: {
    name: 'Kho',
    perms: ['dashboard.view','catalog.view','inventory.view','inventory.manage',
      'production.view','production.manage'],
  },
  cskh: {
    name: 'CSKH',
    perms: ['dashboard.view','catalog.view','partner.view','sales.view'],
  },
};

export function roleHas(perms: string[], perm: string): boolean {
  return perms.includes(perm);
}
