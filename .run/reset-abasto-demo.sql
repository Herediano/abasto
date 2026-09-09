BEGIN;

-- Titular: Abasto Demo
-- tenant = 8d965d50-7585-42e4-86fa-79368cf5beb7

-- 1) Notas de credito y sus lineas
DELETE FROM credit_note_lines WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM credit_notes WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';

-- 2) Pagos, movimientos de cuenta corriente, lineas y ventas
DELETE FROM sale_payments WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM customer_account_movements WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM sale_lines WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM sales WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM sale_sequences WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';

-- 3) Caja: movimientos y turnos (la caja fisica se conserva)
DELETE FROM cash_movements WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM cash_shifts WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';

-- 4) Compras: revisiones, lineas e invoices
DELETE FROM purchase_invoice_revisions WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM purchase_invoice_lines WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM purchase_invoices WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';

-- 5) Stock y lotes
DELETE FROM stock_movements WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM product_lots WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';

-- 6) Productos y sus tablas hijas
DELETE FROM product_suppliers WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM product_barcodes WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM product_price_history WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM price_tiers WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM product_prices WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM products WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM categories WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM price_rules WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM rounding_rules WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM promotions WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';

-- 7) Proveedores y clientes
DELETE FROM payment_adjustments WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM suppliers WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';
DELETE FROM customers WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';

-- 8) Tareas del tablero
DELETE FROM tasks WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7';

-- 9) Infraestructura de sucursales extra (demo "Sucursal Centro"); se conserva
--    la de origen: warehouse 'CC-DEP', branch 'CC', caja 'Caja 1'
DELETE FROM cash_registers WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7'
  AND warehouse_id NOT IN (SELECT id FROM warehouses WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7' AND code = 'CC-DEP');
DELETE FROM warehouses WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7'
  AND code <> 'CC-DEP';
DELETE FROM users WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7'
  AND email <> 'martin@abastodemo.com';
DELETE FROM branches WHERE tenant_id = '8d965d50-7585-42e4-86fa-79368cf5beb7'
  AND code <> 'CC';

-- 10) Contadores a cero (secuencia de codigo de producto)
UPDATE tenants SET product_code_seq = 0 WHERE id = '8d965d50-7585-42e4-86fa-79368cf5beb7';

COMMIT;