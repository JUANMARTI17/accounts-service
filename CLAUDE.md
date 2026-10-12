# 🏦 CLAUDE.md — Microservicio `accounts` (Node.js + TypeScript)

> **Instrucciones para Claude Code.** Lee este documento completo antes de escribir código. Este proyecto es una tarea universitaria (Electiva 2): tres microservicios se comunican de forma asíncrona usando **Apache Kafka alojado en Aiven**. Este servicio es una reescritura en Node.js de un diseño original en Java/Spring; la arquitectura (hexagonal + DDD) y los contratos de eventos NO cambian.

---

## 🎯 Objetivo del microservicio

1. **Consumir el evento `USER_CREATED`** del topic `users.created` (lo publica el servicio `Users` al crear un usuario).
2. **Crear automáticamente una cuenta** en PostgreSQL (**Supabase**, la misma base que usa `Users`).
3. **Publicar un evento `ACCOUNT_CREATED`** en el topic `accounts.created` para que `notificaciones` u otro servicio lo consuma.

```text
Users (POST /api/users)
  → publica en "users.created"
    → Accounts consume users.created
      → crea la cuenta en la tabla accounts
        → publica en "accounts.created"
          → Notificaciones consume y envía correo (si aplica)
```

---

## 🧰 Stack técnico

| Necesidad            | Librería                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Runtime              | Node.js LTS (≥ 22)                                                                        |
| Lenguaje             | TypeScript en modo `strict`                                                               |
| HTTP                 | Express 5                                                                                 |
| Kafka                | `kafkajs` (100 % JavaScript, sin binarios nativos: funciona igual en Windows y en Render) |
| PostgreSQL           | `pg` (Pool) con SQL crudo, sin ORM                                                        |
| Validación           | `zod` (variables de entorno, comando del caso de uso y eventos entrantes)                 |
| Variables de entorno | `dotenv`                                                                                  |
| Logs                 | `pino` (+ `pino-pretty` solo en desarrollo)                                               |
| Desarrollo           | `tsx watch`                                                                               |
| Pruebas              | `vitest`                                                                                  |
| Lint/format          | ESLint + Prettier                                                                         |

Usa ES modules (`"type": "module"` en `package.json`, `module`/`moduleResolution` = `NodeNext` en `tsconfig.json`).

---

## 🏗️ Arquitectura obligatoria: Hexagonal + DDD

Regla de dependencias estricta:

```text
domain ← application ← infrastructure
```

- `domain` es TypeScript puro: **no importa** `pg`, `kafkajs`, `express`, `zod`, `pino` ni nada de `application` o `infrastructure`.
- `application` solo importa `domain` y define interfaces (puertos). Puede usar `zod` para validar el comando.
- `infrastructure` implementa los puertos y es la única capa que conoce librerías externas.
- **Sin framework de inyección de dependencias:** todo se conecta a mano en `src/main.ts` (composition root).

### Estructura de carpetas

```text
accounts/
├── CLAUDE.md
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── .env                ← NO se commitea
├── .env.example        ← sí se commitea
├── .gitignore
├── ca.pem              ← certificado de Aiven, NO se commitea
├── sql/
│   └── schema.sql      ← solo documentación (la tabla ya existe)
├── src/
│   ├── main.ts                                   ← composition root + arranque + apagado limpio
│   ├── domain/
│   │   ├── model/AccountModel.ts                 ← agregado inmutable con fábricas create() y restore()
│   │   ├── valueobject/AccountId.ts              ← UUID validado
│   │   ├── valueobject/UserId.ts                 ← referencia al usuario (no vacío)
│   │   ├── valueobject/AccountBalance.ts         ← decimal ≥ 0, máx. 2 decimales (guardar como string, no float)
│   │   ├── valueobject/Currency.ts               ← código ISO de 3 letras mayúsculas
│   │   ├── enums/AccountStatus.ts                ← ACTIVE | INACTIVE | SUSPENDED
│   │   ├── event/DomainEvent.ts                  ← clase base abstracta: eventId, eventType, occurredAt, aggregateId
│   │   ├── event/AccountCreatedDomainEvent.ts    ← fábrica estática from(account)
│   │   └── exception/
│   │       ├── DomainException.ts
│   │       └── AccountAlreadyExistsException.ts  ← fábrica estática becauseUserIdAlreadyHasAccount(userId)
│   ├── application/
│   │   ├── port/in/CreateAccountUseCase.ts
│   │   ├── port/in/GetAccountByUserIdUseCase.ts
│   │   ├── port/out/SaveAccountPort.ts
│   │   ├── port/out/FindAccountByUserIdPort.ts
│   │   ├── port/out/AccountEventPublisherPort.ts
│   │   ├── service/CreateAccountService.ts
│   │   ├── service/GetAccountByUserIdService.ts
│   │   └── service/dto/CreateAccountCommand.ts   ← tipo + esquema zod
│   └── infrastructure/
│       ├── config/env.ts                         ← carga dotenv y valida TODO con zod; falla rápido con mensaje claro
│       ├── config/logger.ts                      ← instancia de pino
│       ├── persistence/pgPool.ts                 ← Pool de pg (máx. 5 conexiones, SSL)
│       ├── persistence/AccountRepositoryPg.ts    ← implementa SaveAccountPort y FindAccountByUserIdPort
│       ├── persistence/AccountPersistenceMapper.ts
│       ├── messaging/kafkaClient.ts              ← instancia de Kafka (SASL_SSL + ca.pem)
│       ├── messaging/dto/UserCreatedEvent.ts     ← esquema zod del evento entrante
│       ├── messaging/KafkaAccountEventPublisher.ts
│       ├── messaging/consumer/UserCreatedConsumer.ts
│       └── http/
│           ├── app.ts                            ← crea la app Express
│           ├── AccountController.ts
│           └── errorHandler.ts
└── test/                                         ← mismas subcarpetas que src
```

---

## 🗄️ Base de datos (Supabase)

La tabla **`accounts` YA EXISTE** en Supabase. **No** la crees ni ejecutes migraciones al arrancar. Guarda este script en `sql/schema.sql` solo como documentación:

```sql
DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.accounts (
    id          VARCHAR(36)     NOT NULL PRIMARY KEY,
    user_id     VARCHAR(36)     NOT NULL UNIQUE,
    balance     NUMERIC(15, 2)  NOT NULL DEFAULT 0.00,
    currency    VARCHAR(3)      NOT NULL DEFAULT 'COP',
    status      account_status  NOT NULL DEFAULT 'ACTIVE',
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_accounts_balance_non_negative CHECK (balance >= 0),
    CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
```

Reglas de persistencia:

- Consultas **siempre parametrizadas** (`$1, $2…`), nunca concatenar strings.
- Al insertar, castear el estado: `$5::account_status`.
- `NUMERIC` llega desde `pg` como **string**: mantenlo como string/decimal, nunca lo conviertas a `number` (pierde precisión).
- Si el INSERT falla con código `23505` (violación de UNIQUE en `user_id`), lánzalo como `AccountAlreadyExistsException`. Así una carrera entre dos eventos del mismo usuario se trata como duplicado.
- Conexión: usar el **Session pooler** de Supabase (`aws-0-<region>.pooler.supabase.com`, puerto 5432, usuario `postgres.<project-ref>`). La conexión directa del plan gratuito es solo IPv6 y falla en muchas redes.
- SSL activado (`ssl: { rejectUnauthorized: false }` cuando `DB_SSL=true`; si se define `DB_SSL_CA`, usar ese certificado con `rejectUnauthorized: true`).

---

## 🔌 Kafka en Aiven

El servicio usa **Apache Kafka alojado en Aiven**, el mismo broker que el servicio `Users`.

```ts
// infrastructure/messaging/kafkaClient.ts (referencia)
new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers: env.KAFKA_BOOTSTRAP_SERVERS.split(','),
  ssl: { ca: [fs.readFileSync(env.KAFKA_SSL_CA_LOCATION, 'utf-8')] },
  sasl: { mechanism: 'plain', username: env.KAFKA_USERNAME, password: env.KAFKA_PASSWORD },
});
```

- Protocolo SASL_SSL, mecanismo PLAIN, CA de Aiven en `ca.pem`.
- Si `ca.pem` no existe, el arranque debe fallar con un mensaje claro que diga la ruta buscada.
- **Consumer:** topic `users.created`, groupId `accounts-service`, `fromBeginning: true`.
- **Producer:** topic `accounts.created`, `acks: -1` (equivale a `all`), `idempotent: true`, `maxInFlightRequests: 1`. La **key** del mensaje es el `accountId`; el **value** es el JSON del contrato.
- Los topics no se crean desde el código: `users.created` ya existe y `accounts.created` se crea en Aiven Console.

### Evento recibido (`users.created`)

```json
{
  "eventId": "5edd7aaa-4171-4d3b-91cd-fd0ae38fd673",
  "eventType": "USER_CREATED",
  "occurredAt": "2026-10-10T17:49:07.414085600",
  "aggregateId": "11111111-1111-1111-1111-111111111111",
  "payload": {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Daniel Big Pickle",
    "email": "daniel@example.com",
    "role": "MEMBER",
    "status": "PENDING"
  }
}
```

El esquema zod debe **ignorar campos desconocidos** y validar como mínimo `eventId`, `eventType` y `aggregateId`. `occurredAt` viene sin zona horaria y con nanosegundos: trátalo como string, no lo parsees con `new Date()`.

### Evento publicado (`accounts.created`)

```json
{
  "eventId": "<uuid>",
  "eventType": "ACCOUNT_CREATED",
  "occurredAt": "2026-10-10T18:00:00.000Z",
  "aggregateId": "<accountId>",
  "payload": {
    "accountId": "<accountId>",
    "userId": "<userId>",
    "balance": 0.0,
    "currency": "COP",
    "status": "ACTIVE"
  }
}
```

`balance` sale como número JSON con dos decimales (convertir el string decimal solo en el momento de serializar).

### Comportamiento del consumer

```text
por cada mensaje:
  1. JSON.parse + validar con zod
     → si falla: log de error con eventId/offset y la clase del error (NUNCA el contenido), y continuar
  2. ignorar si eventType !== "USER_CREATED"
  3. createAccountUseCase.execute({ userId: aggregateId, initialBalance: "0.00", currency: "COP" })
  4. AccountAlreadyExistsException → log debug "evento ignorado (idempotencia)" y continuar
  5. cualquier otro error → log error y continuar (no relanzar: evita reprocesar en bucle)
```

---

## 📋 Casos de uso

### `CreateAccountService`

```text
1. Validar el comando con zod.
2. findAccountByUserIdPort.findByUserId(userId) → si existe, lanzar AccountAlreadyExistsException.
3. AccountModel.create(userId, initialBalance, currency) → status ACTIVE, id UUID nuevo.
4. saveAccountPort.save(account).
5. eventPublisherPort.publishAccountCreated(AccountCreatedDomainEvent.from(saved))  ← SIEMPRE después de guardar.
6. Devolver la cuenta guardada.
```

Si la publicación en Kafka falla después de guardar, se loguea el error y no se revierte la cuenta (limitación conocida; la solución completa sería un patrón outbox, fuera del alcance).

### `GetAccountByUserIdService`

Reutiliza `FindAccountByUserIdPort`. Lo usa el endpoint REST.

---

## 🌐 API REST

| Método | Ruta                         | Respuesta                               |
| ------ | ---------------------------- | --------------------------------------- |
| GET    | `/health`                    | `200 { "status": "UP" }`                |
| GET    | `/api/accounts/user/:userId` | `200` con la cuenta, `404` si no existe |

Respuesta de cuenta: `{ accountId, userId, balance, currency, status, createdAt, updatedAt }`. Errores en formato `{ "error": "<código>", "message": "<texto>" }`, sin stack traces.

---

## ⚙️ Variables de entorno

`.env.example`:

```env
# Servidor
PORT=8081
NODE_ENV=development
LOG_LEVEL=info

# PostgreSQL en Supabase (MISMA base que Users) — pedir datos a Daniel
DB_HOST=<host_del_session_pooler_de_supabase>
DB_PORT=5432
DB_NAME=postgres
DB_USERNAME=<postgres.project_ref>
DB_PASSWORD=<pedir_a_Daniel>
DB_SSL=true
DB_POOL_MAX=5

# Kafka en Aiven (MISMO broker que Users)
KAFKA_CLIENT_ID=accounts-service
KAFKA_BOOTSTRAP_SERVERS=kafka-wallet-wallet-platform.f.aivencloud.com:25157
KAFKA_USERNAME=avnadmin
KAFKA_PASSWORD=<pedir_a_Daniel>
KAFKA_SSL_CA_LOCATION=./ca.pem
KAFKA_GROUP_ID=accounts-service
KAFKA_TOPIC_USER_CREATED=users.created
KAFKA_TOPIC_ACCOUNT_CREATED=accounts.created
```

- `env.ts` valida todo con zod y, si un valor falta o sigue con un marcador `<...>`, termina el proceso con un mensaje que nombre la variable (sin imprimir su valor).
- En Render, `KAFKA_SSL_CA_LOCATION=/etc/secrets/ca.pem` (Secret File).

---

## 🔐 Seguridad

- **Nunca** loguear email, nombre, balance, contraseñas ni el contenido crudo de un mensaje. Solo `userId`, `accountId`, `eventId`, topic, partición y offset.
- **Nunca** escribir credenciales en el código ni en archivos versionados.
- `.gitignore` debe incluir: `node_modules/`, `dist/`, `.env`, `ca.pem`, `*.log`, `coverage/`.

---

## 🛑 Arranque y apagado

`main.ts`:

1. Cargar y validar el entorno.
2. Crear pool, repositorio, publisher, servicios y consumer (inyección manual).
3. Verificar la base con `SELECT 1`.
4. Conectar el producer, luego el consumer, y suscribirse.
5. Levantar Express.
6. Ante `SIGINT`/`SIGTERM`: cerrar HTTP → desconectar consumer → desconectar producer → cerrar pool → `process.exit(0)`.

---

## 🧪 Pruebas (vitest)

- Value objects (valores válidos e inválidos).
- `AccountModel.create`.
- `CreateAccountService`: cuenta nueva (guarda y publica), cuenta duplicada (lanza y no publica), fallo al guardar (no publica). Puertos simulados con `vi.fn()`.
- `UserCreatedConsumer`: mensaje válido, JSON inválido, `eventType` distinto, duplicado.
- Contrato JSON del `KafkaAccountEventPublisher`.

Las pruebas no deben requerir base de datos ni Kafka reales.

---

## 🚀 Scripts de `package.json`

```json
{
  "dev": "tsx watch src/main.ts",
  "build": "tsc -p tsconfig.json",
  "start": "node dist/main.js",
  "test": "vitest run",
  "test:watch": "vitest",
  "lint": "eslint .",
  "format": "prettier --write ."
}
```

---

## 🧭 Orden de implementación

1. `package.json`, `tsconfig.json`, ESLint, Prettier, vitest, `.gitignore`.
2. `sql/schema.sql` (documentación).
3. Capa `domain`.
4. Capa `application`.
5. Capa `infrastructure` (env, logger, pg, Kafka, HTTP).
6. `main.ts`.
7. Pruebas.
8. `.env.example` y `.env`.
9. `npm run build` y `npm test` sin errores.

_Fin del CLAUDE.md._
