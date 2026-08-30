# Modelo de datos base

## Estrategia multi-tenant

Un único esquema de PostgreSQL con una columna `tenant_id` en cada tabla de negocio. Es más simple de operar y mantener que crear un esquema separado por cliente. La API deberá obtener el tenant desde la sesión y aplicar siempre ese filtro.

## Tablas principales

### `tenants`

- `id` UUID, PK
- `name`, `legal_name`, `tax_id`
- `status`
- `created_at`, `updated_at`

### `products`

- `id` UUID, PK
- `tenant_id` UUID, FK a `tenants`
- `sku`, `barcode`, `name`, `description`
- `category` categoría o rubro, opcional
- `unit`, `brand`
- `maneja_vencimiento` booleano
- `is_active`
- `created_at`, `updated_at`

Regla: `sku` único dentro de cada tenant.

### `suppliers`

- `id` UUID, PK
- `tenant_id` UUID, FK a `tenants`
- `name`, `legal_name`, `tax_id`
- `email`, `phone`, `address`
- `is_active`
- `created_at`, `updated_at`

### `customers`

- `id` UUID, PK
- `tenant_id` UUID, FK a `tenants`
- `name`, `legal_name`, `tax_id`
- `email`, `phone`, `address`
- `is_active`
- `created_at`, `updated_at`

### `warehouses`

- `id` UUID, PK
- `tenant_id` UUID, FK a `tenants`
- `name`, `code`, `address`
- `is_active`
- `created_at`, `updated_at`

Regla: `code` único dentro de cada tenant.

### `product_lots`

- `id` UUID, PK
- `tenant_id` UUID, FK a `tenants`
- `product_id` UUID, FK a `products`
- `warehouse_id` UUID, FK a `warehouses`
- `supplier_id` UUID, FK a `suppliers`, opcional
- `lot_number`
- `expiration_date`, opcional
- `received_at`, opcional
- `created_at`, `updated_at`

Regla: `lot_number` único por producto dentro de cada tenant. Un mismo lote físico puede repartirse entre varios depósitos; `warehouse_id` queda como el depósito donde se recibió originalmente y no forma parte de la regla de unicidad. La cantidad disponible en cada depósito se trackeará más adelante mediante movimientos de stock, no en esta tabla. La fecha de vencimiento queda opcional en la base; el backend deberá exigirla cuando `maneja_vencimiento = true`.

## Posible unificación futura de entidades

Hoy `suppliers` y `customers` son tablas separadas con campos casi idénticos. Si en algún momento confirmamos que una misma empresa puede ser cliente y proveedor a la vez, evaluaremos unificarlas en una sola tabla con un rol. Por ahora seguimos con las dos tablas separadas.
