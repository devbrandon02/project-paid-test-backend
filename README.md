# Wompi Payment Backend

API en NestJS para la gestión de productos y procesamiento de pagos con Wompi Sandbox.

## Requisitos

- Node.js >= 18
- Docker y Docker Compose

## Instalación y ejecución

1. Clonar el repositorio e instalar dependencias:

```bash
npm install
```

2. Iniciar la base de datos (PostgreSQL):

```bash
docker compose up -d
```

3. Configurar variables de entorno:

```bash
cp .env.example .env
```

4. Aplicar esquema de base de datos y poblar datos iniciales:

```bash
npx prisma db push
npx prisma db seed
```

5. Iniciar la aplicación:

```bash
# Desarrollo
npm run start:dev

# Producción
npm run build
npm run start:prod
```

La API quedará escuchando en `http://localhost:3000`.

## Endpoints principales

### Productos
- `GET /products`: Listado de productos disponibles y stock.
- `GET /products/:id`: Detalle de un producto por ID.

### Transacciones
- `POST /transactions`: Crea una transacción en estado PENDING con los datos de entrega y cliente.
- `POST /transactions/payment`: Procesa el pago con tarjeta a través de Wompi Sandbox, tokeniza la tarjeta, genera la firma de integridad SHA-256 y descuenta stock si es aprobado.
- `GET /transactions/:id`: Consulta el estado y detalle de una transacción.

## Pruebas

Para ejecutar las pruebas unitarias:

```bash
npm test
```
