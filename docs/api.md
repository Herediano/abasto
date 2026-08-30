# API base

La API corre en `http://localhost:3000` y usa el prefijo `/api`.

## Endpoints

- `GET /api/health`: verifica API y conexión a PostgreSQL.
- `GET /api/tenants`: lista tenants.
- `GET /api/tenants/:id`: obtiene un tenant.
- `POST /api/tenants`: crea un tenant. Body mínimo: `{ "name": "Mi mayorista" }`.
- `GET /api/products`: lista productos del tenant indicado por `x-tenant-id`.
- `GET /api/products/:id`: obtiene un producto del tenant indicado.
- `POST /api/products`: crea un producto del tenant indicado.

Ejemplo:

```bash
curl -H "x-tenant-id: <TENANT_UUID>" http://localhost:3000/api/products
```

El header `x-tenant-id` es temporal para desarrollo. En producción deberá reemplazarse por el tenant derivado de la sesión autenticada.
