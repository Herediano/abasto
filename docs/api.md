# API base

La API corre en `http://localhost:3000` y usa el prefijo `/api`.

## Endpoints

- `GET /api/health`: verifica API y conexión a PostgreSQL.
- `GET /api/tenants`: lista tenants.
- `GET /api/tenants/:id`: obtiene un tenant.
- `POST /api/tenants`: crea un tenant. Body mínimo: `{ "name": "Mi mayorista" }`.
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
- `GET/POST /api/products/:productId/lots`: lista y crea lotes. La fecha de vencimiento es obligatoria para productos con `maneja_vencimiento`.

## Autenticación

- `POST /api/auth/signup`: crea un tenant y su primer usuario en una transacción; devuelve un JWT.
- `POST /api/auth/login`: autentica por email y contraseña; devuelve un JWT válido por 8 horas.
- `POST /api/users`: crea otro usuario dentro del tenant del JWT.

Los endpoints de tenants, productos, stock, depósitos y lotes requieren `Authorization: Bearer <JWT>`. El tenant se obtiene del usuario autenticado; `x-tenant-id` ya no es aceptado ni utilizado. Las contraseñas se almacenan con Argon2id.

## Stock

El módulo de Stock usa `x-tenant-id` para seleccionar el tenant durante el desarrollo local. Este header todavía no está validado contra un usuario autenticado: cualquiera que lo envíe manualmente puede operar como ese tenant. Esto es aceptable mientras el sistema se use únicamente en local, pero antes de conectar un frontend real o exponer la API fuera de la máquina hay que implementar autenticación real (login + sesión/token) y derivar el tenant desde ella. Es el próximo tema grande pendiente después de estabilizar Stock.
