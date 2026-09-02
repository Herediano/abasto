# API base

La API corre en `http://localhost:3000` y usa el prefijo `/api`.

## Endpoints

- `GET /api/health`: verifica API y conexión a PostgreSQL.
- `GET /api/tenants`: devuelve el tenant del usuario autenticado (siempre una lista de un elemento).
- `GET /api/tenants/:id`: obtiene el tenant del usuario autenticado; 404 si el id no coincide.
- `GET /api/products`: lista productos del tenant autenticado.
- `GET /api/products/:id`: obtiene un producto del tenant autenticado.
- `POST /api/products`: crea un producto en el tenant autenticado.

Ejemplo:

```bash
curl -H "Authorization: Bearer <JWT>" http://localhost:3000/api/products
```

Los endpoints protegidos usan el tenant derivado del JWT; ya no aceptan `x-tenant-id`.

## Catálogo

- `GET/POST /api/warehouses`: lista y crea depósitos.
- `GET /api/suppliers`: lista proveedores activos para seleccionar en lotes.
- `POST /api/suppliers`: crea un proveedor del tenant autenticado. Recibe `name` obligatorio y opcionalmente `legalName`, `taxId`, `email`, `phone` y `address`.
- `PUT /api/suppliers/:id`: modifica un proveedor; requiere rol `admin`.
- `PUT /api/products/:id`: modifica barcode, código interno, nombre, categoría, unidad, marca y vencimiento; requiere rol `admin`.
- `PUT /api/warehouses/:id`: modifica nombre, código y dirección; requiere rol `admin`.
- `PUT /api/products/:productId/lots/:lotId`: modifica número de lote, vencimiento, proveedor y depósito; requiere rol `admin`.
- `GET /api/purchases/invoices`: lista facturas de compra del tenant.
- `POST /api/purchases/invoices`: crea una factura en borrador. Recibe proveedor, tipo A/B/C/E/M/other, punto de venta, número, fecha y líneas con `barcode`, `quantity`, `unitCost`, `taxRate` y lote opcional/obligatorio según el producto. El depósito se toma del usuario autenticado.
- `POST /api/purchases/invoices/:id/confirm`: confirma la recepción; genera los movimientos `purchase_in` y actualiza el stock de la sucursal. No permite confirmar dos veces.
- `GET/POST /api/products/:productId/lots`: lista y crea lotes. La fecha de vencimiento es obligatoria para productos con `maneja_vencimiento`.

## Autenticación

- `POST /api/auth/signup`: crea un tenant y su primer usuario (rol `admin`) en una transacción; devuelve un JWT. Es la única forma de crear un tenant nuevo.
- `POST /api/auth/login`: autentica por email y contraseña; devuelve un JWT válido por 8 horas.
- `POST /api/users`: crea otro usuario dentro del tenant del JWT; requiere rol `admin`.

Todos los endpoints (salvo `/api/health` y `/api/auth/*`) requieren `Authorization: Bearer <JWT>`. El tenant se obtiene siempre del usuario autenticado; no existe ni se acepta ningún header `x-tenant-id`. Las contraseñas se almacenan con Argon2id.
