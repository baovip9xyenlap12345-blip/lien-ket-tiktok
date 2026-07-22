# ERD RÚT GỌN (chi tiết cột sẽ nằm trong prisma/schema.prisma)

## Nhóm tổ chức & người dùng
company ─< branch ─< warehouse ─< warehouse_location
user ── employee(branch) ; role ─< role_permission >─ permission ; user_scope(own/team/branch/all)
session, audit_log(actor, action, entity, before/after, ip, ua, at), idempotency_key

## Đối tác/CRM
partner(type: customer|supplier|agent; is_company, tax_code, group, lead_source, sale_owner,
 price_list_id, credit_limit, credit_days) ─< partner_contact, partner_address(bill/ship default)
crm_activity(call/note/task, remind_at) ; attachment(entity_type, entity_id, s3_key, acl)

## Sản phẩm
product(type: finished|material|semi|service|combo|custom|ai_bear; unit_id, tax_default)
 ─< product_variant(sku UNIQUE, barcode, attrs jsonb) ─< product_image
category, attribute, unit, unit_conversion(factor, locked_after_use)
price_list(kind: retail|wholesale|agent|company|custom; valid_from/to)
 ─< price_rule(variant, min_qty, price, priority)
bundle ─< bundle_item(deduct_mode: bundle|components)
ai_device(variant, serial UNIQUE, activated_at) ─ warranty
bom ─< bom_version(valid_from, waste_pct) ─< bom_item(material_variant, qty per unit)

## Bán hàng
quote(code, partner, price_list, vat_mode, status, version) ─< quote_item(snapshot fields)
sales_order(code, quote_id?, 4 trục trạng thái, vat_mode, totals...) ─< sales_order_item(snapshot)
approval(discount/credit, approver, reason) ; order_status_history(4 loại)

## Sản xuất
design_request ─< design_version(file, status) ─< design_comment ; design_approval(version, by, at)
production_order(code, so_item?, bom_version, plan_qty, due, priority)
 ─< production_step(prep|cut|sew|stuff|finish|qc|pack) ─< production_progress(ok, defect, redo, by, photo)
material_requirement ; material_issue(stock_movement_ref) ; qc_check ─< qc_item(pass/fail, reason, photo)

## Kho
stock_movement(IMMUTABLE: variant, warehouse, location, qty ±, ref_type, ref_id, by, at)
inventory_balance(projection: variant×warehouse → on_hand)  — chỉ ghi qua service
stock_reservation(so_item, qty, status) ; stock_transfer(status: transit→received)
stock_count ─< stock_count_item(system_qty, counted_qty, diff, approved)

## Giao hàng & đổi trả
shipment(so, address, carrier, tracking_no, fee, cod_amount, status) ─< shipment_item
shipment_status_history ; cod_reconciliation(batch, shipments, received_at)
return ─< return_item(so_item ref, qty, restock|destroy) ; refund(→ payment_voucher link)

## Tài chính
fund_account(cash|bank|cod_pending) ; receipt / payment_voucher(code, fund, partner, amount, status, files)
allocation(receipt ↔ document, amount) ; transaction(ledger dòng tiền quỹ)
receivable_entry(ledger công nợ: +invoice −allocation −refund ±adjust) ; accounting_period_lock
credit_limit_approval

## Nhân sự
work_shift, attendance ; kpi_plan(period, targets jsonb) ; commission_rule(version, base: revenue|collected|profit)
commission_result(period, locked) ; payroll(status draft→approved→paid) ─< payroll_item ; task(giao việc)

## Hệ thống
setting(key, value jsonb) ; document_sequence(prefix, branch, next_no) ; document_template
notification ; integration_connection ; webhook_event(idempotency) ; sync_job ─< sync_log ; trash_record

Ràng buộc: FK đầy đủ, UNIQUE(sku, serial, mã chứng từ), CHECK(qty>0, amount>=0),
index theo (code), (status), (created_at), khóa ngoại + bộ lọc hay dùng. Optimistic locking (version) cho
sales_order, inventory_balance, payroll.
