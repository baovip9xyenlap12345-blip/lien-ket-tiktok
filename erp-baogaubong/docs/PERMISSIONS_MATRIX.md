# MA TRẬN PHÂN QUYỀN (RBAC + DATA SCOPE)

Hành động: X=xem, T=tạo, S=sửa, XM=xóa mềm, D=duyệt, E=xuất file. Scope: OWN/TEAM/BRANCH/ALL.

| Phân hệ | Admin | Sale | Kế toán | Kho | CSKH |
|---|---|---|---|---|---|
| Khách hàng/CRM | full ALL | X,T,S OWN | X ALL | — | X,T(hoạt động) ASSIGNED |
| Báo giá/Đơn | full ALL | X,T,S OWN; D trong hạn mức CK | X ALL | X BRANCH (không giá vốn) | X ASSIGNED |
| POS | full | T | X | — | — |
| Kho (nhập/xuất/chuyển/kiểm) | full | — | X | X,T,S BRANCH | — |
| Giao hàng | full | X OWN | X | X,T,S | X ASSIGNED |
| Đổi trả/hoàn tiền | full | T (chờ duyệt) | D | T nhập lại kho | X |
| Thu/chi/quỹ | full | X thu của đơn mình | full | — | — |
| Công nợ | full | X OWN | full ALL | — | X ASSIGNED |
| Sản xuất | full | X đơn mình | X chi phí | cấp phát NVL | X tiến độ |
| Thiết kế/duyệt mẫu | full | T,X OWN | — | — | T,X ASSIGNED |
| Nhân viên/lương | full | xem lương MÌNH | X,T,S theo quyền | xem lương MÌNH | xem lương MÌNH |
| KPI/hoa hồng | full | X của mình | X,T | — | X của mình |
| Báo cáo tài chính/lợi nhuận | full | doanh số của mình | full | — | — |
| Giá vốn | full | ẨN | X | ẨN (mặc định) | ẨN |
| Cài đặt/tích hợp/phân quyền | full | — | — | — | — |
| Audit log | X (không sửa/xóa) | — | X phần tài chính | — | — |
| Portal đại lý | quản trị | — | — | — | — |

Quy tắc cứng: kiểm quyền tại server cho MỌI route/API; frontend chỉ ẩn/hiện.
Vượt hạn mức chiết khấu/công nợ → tạo approval, chỉ role có quyền D được duyệt.
Gộp khách trùng: quyền riêng `partner.merge` + audit. Sửa kỳ đã khóa: `finance.unlock` + lý do.
