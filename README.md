# backend-crm

Backend de un CRM en **NestJS + Prisma (PostgreSQL)**, construido con **arquitectura hexagonal (ports & adapters)** y **BDD ejecutable** (jest-cucumber). Este README es el documento de contexto del proyecto: resume las reglas, decisiones de diseño y el estado actual para retomar el trabajo.

---

## Stack

- **NestJS 11**, TypeScript (`module/moduleResolution: nodenext`, salida CommonJS).
- **Prisma 7** con `@prisma/adapter-pg` (driver adapter sobre `pg`).
- **PostgreSQL** en Supabase (free plan) — ver [Base de datos](#base-de-datos).
- **Jest 30** + **jest-cucumber** para specs BDD. **class-validator/class-transformer** para DTOs.
- Gestor de paquetes: **pnpm**.

---

## Principios y convenciones

### Arquitectura hexagonal
- El **dominio** y la **aplicación** (casos de uso) **no dependen de NestJS** ni de Prisma. Solo dependen de **puertos** (interfaces).
- Los **adaptadores** (in-memory, Prisma, scrypt, HTTP) implementan los puertos. La dirección de dependencias siempre apunta hacia el dominio (DIP).
- Estructura por **contexto** (`users`, `tasks`, …), y dentro de cada uno: `domain/`, `application/`, `infrastructure/`.

### Casos de uso *framework-free*
- Los use cases son clases planas con inyección por constructor — **sin** `@Injectable`.
- Se cablean en los módulos con **`useFactory`** (no `useClass`) para que la capa de aplicación quede libre de decoradores de Nest. Ver `src/users/users.module.ts` y `src/tasks/tasks.module.ts`.

### BDD primero
- Toda **behavior nueva arranca de un escenario Gherkin** en `specs/*.feature`.
- Los steps viven en `src/**/tests/*.steps.ts` y corren contra los **adaptadores in-memory** (rápidos, sin DB).
- Enforcement de reglas (p. ej. autorización) se agrega **cuando un escenario lo pide**, no antes.

### OO / diseño
- Preferir **polimorfismo sobre condicionales por tipo**, pero ubicando el comportamiento donde corresponde (ver [discusión de autorización](#discusión-pendiente-autorización-por-rol)).
- Errores de dominio expresan **semántica**, nunca transporte (sin status codes en el dominio).

### Imports
- **Alias absoluto `@/` → `src/`**. Ej: `import { ViewTask } from '@/tasks/application/view-task.use-case'`.
- Funciona en 3 capas: `tsconfig.json` (`paths`), **runtime** vía `tsc-alias` (el `build` es `nest build && tsc-alias -p tsconfig.build.json`), y **jest** vía `moduleNameMapper`.

### Commits
- **Chicos y enfocados**, estilo Conventional Commits (`feat(scope): …`, `refactor: …`).
- **Refactors en commits separados** de las features.
- **Sin** trailer `Co-Authored-By`.

---

## Estado actual

### Contexto `users` (`src/users`)
- **Dominio**: `User` (la identidad la asigna el repositorio en el primer `save` vía `assignId`; antes el id es `null`), enum `UserRole` (`USER` | `ADMIN` | `CREATOR`).
- **Puertos**: `UserRepository`, `PasswordHasher`.
- **Casos de uso**: `CreateUser`, `ChangePassword`, `ChangeUserRole`.
- **Adaptadores**: `InMemoryUserRepository`, `PrismaUserRepository` (resuelve el rol contra `user_role.description`), `ScryptPasswordHasher`.
- **Endpoints** (`UsersController`):
  - `POST /users` — crear usuario (`CreateUserDto`).
  - `PATCH /users/me/password` — cambiar la propia contraseña (userId sale del `Actor`).
  - `PATCH /users/:id/role` — cambiar el rol.

### Contexto `tasks` (`src/tasks`)
- **Dominio**: `Task` lleva `id` (lo asigna el repositorio en el primer `save`; antes es `null`), `ownerId`, `assigneeId` (puede ser `null` = sin asignar), `title` y `description`. **No modela** historial de asignaciones ni estados. `TaskAccessPolicy` (domain service) con `canView` (privilegiado o dueño), `canReassign` (solo dueño) y `canAssignTo` (uno mismo, o privilegiado para asignar a otro / dejar sin asignar).
- **Puertos**: `TaskRepository`.
- **Casos de uso**: `CreateTask`, `ViewTask`, `ReassignTask`.
- **Adaptadores**: `InMemoryTaskRepository` (asigna identidad con un contador), `PrismaTaskRepository`.
- **Endpoints** (`TasksController`):
  - `POST /tasks` — crear tarea (`CreateTaskDto`: `title`, `description`, `assigneeId?`). Omitir `assigneeId` → para uno mismo; `null` → sin asignar (solo privilegiados); un id → a ese usuario (solo privilegiados, salvo que sea uno mismo).
  - `GET /tasks/:id` — ver tarea (autorizado por rol/ownership).
  - `PATCH /tasks/:id/assignee` — reasignar (`ReassignTaskDto`, solo el dueño).

### Shared / common / auth
- `src/shared/domain/actor.ts` — **`Actor`** (`{ id, role }`), kernel compartido entre contextos.
- `src/shared/domain/domain-error.ts` — jerarquía `DomainError` → `NotFoundError` / `AuthorizationError` (usa `new.target.name`).
- `src/common/filters/domain-exception.filter.ts` — `DomainExceptionFilter` global: mapea **por categoría** (`NotFoundError`→404, `AuthorizationError`→403). Los controllers **no hacen try/catch**.
- `src/auth/` — **vacío (placeholder)**. El `Actor` se obtiene con el decorator `@CurrentActor()` que hoy lee los headers `x-user-id` / `x-user-role`. **La autenticación NO está implementada ni hay enforcement.**
- Scaffolding aún vacío: `companies`, `contacts`, `task-activities`, `task-assignments`.

### Configuración transversal (`AppModule`)
- `APP_FILTER` → `DomainExceptionFilter`.
- `APP_PIPE` → `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- `PrismaModule` es `@Global` y exporta `PrismaService` (extiende `PrismaClient`).

---

## Decisiones de diseño clave (el *por qué*)

1. **Identidad la asigna el repositorio.** El dominio no inventa ids; los crea la DB (autoincrement). `User.assignId` solo se permite una vez.
2. **`Task` lleva lo justo para autorizar y crear.** Identidad, `ownerId`, `assigneeId` (nullable), `title` y `description`; no modela historial ni estados. `PrismaTaskRepository.save` **despacha por identidad**: sin id → INSERT de la fila `task` (+ un `task_assignment` opcional si tiene assignee); con id → reasignación de una tarea existente. Mapeo: `ownerId ↔ task.created_by`; `assigneeId ↔ user_id` del `task_assignment` más reciente (si no hay, cae al owner **en la lectura**). Reasignar **actualiza la asignación más reciente en su lugar** (no apila historial). Al crear, `assigned_by = created_by` porque el dueño es quien asigna (la política lo garantiza). Como el agregado no modela estados, las filas que requieren uno usan el `status` de menor id como default.
3. **Hasher con `scrypt` nativo** (`ScryptPasswordHasher`) para no sumar dependencias nativas (bcrypt/argon2). Salt aleatorio por hash, comparación constante.
4. **Errores → HTTP por polimorfismo**, no por enumerar clases. Agregar un error nuevo solo requiere extender la base correcta; el filtro no se toca (Open/Closed).
5. **`Actor` en shared kernel** para que `users` no dependa de `tasks`.
6. **Auth diferida**: `@CurrentActor()` por headers es un **seam único** a reemplazar cuando exista auth real. `POST /users` y `PATCH /users/:id/role` hoy **no exigen** actor (consistente con "enforcement cuando un escenario lo pida").
7. **Alias `@` + `tsc-alias`** porque `tsc` no reescribe los alias en el output CommonJS; sin esto, `require('@/..')` rompería en runtime.

---

## Base de datos

- `DATABASE_URL` (en `.env`) apunta a una **Postgres de Supabase (free)** vía session pooler. Es técnicamente "producción" pero se trata como **DB de dev descartable** (vacía; se llena y se limpia después).
- La tabla `user_role` está seedeada: `1:USER, 2:ADMIN, 3:CREATOR`. El `PrismaUserRepository` resuelve roles por `user_role.description`.
- Esquema en `prisma/schema.prisma`. Tablas relevantes: `app_user`, `user_role`, `task`, `task_assignment`, `task_status`, `assignment_status`, `task_activity`, `company`, `contact`, etc.

---

## Tests

- **Unitarios + BDD** (`*.spec.ts`, `*.steps.ts`): corren con `pnpm test`, **sin DB** (usan adaptadores in-memory / dobles).
- **Integración Prisma** (`*.repository.spec.ts`): **opt-in**. Solo corren si `TEST_DATABASE_URL` está seteado, si no quedan `describe.skip`. **Escriben y borran filas** → la URL debe apuntar a una **DB descartable**.

Correr integración (el quoting del `.env` es molesto, resolver la URL con dotenv):
```bash
export TEST_DATABASE_URL="$(node -e 'require("dotenv").config({quiet:true}); process.stdout.write((process.env.DATABASE_URL||"").trim())')" && pnpm exec jest prisma-user.repository.spec
```
> `config({quiet:true})` es obligatorio o dotenv contamina la URL con su banner.

- **e2e** (`test/app.e2e-spec.ts`): scaffolding por defecto, **tiene un error de tsc preexistente** y no corre en `pnpm test`.

---

## Comandos

```bash
pnpm install
pnpm build          # nest build && tsc-alias  (output a dist/)
pnpm start:dev      # watch mode
pnpm start:prod     # node dist/main
pnpm test           # jest (integración skippeada salvo TEST_DATABASE_URL)
pnpm run format     # prettier --write   (ojo: ver nota de line-endings abajo)
pnpm run lint       # eslint --fix
```

---

## Próximos pasos / deuda conocida

- **Autenticación real** (login/JWT) reemplazando el `@CurrentActor()` de headers, y enforcement donde haga falta.
- **`Task.status` en el dominio**: hoy la creación usa el `task_status` de menor id como default; cuando el flujo de estados importe, modelarlo en el agregado en vez de inferirlo en el adaptador.
- **e2e** roto (tsc) — arreglar o reescribir.
- **Line-endings**: prettier "warnea" repo-wide por CRLF/LF (preexistente, no introducido por los cambios). Se podría cerrar con un `.gitattributes` (`* text=auto eol=lf`) en un commit aparte.
- Contextos scaffolding vacíos: `companies`, `contacts`, `task-activities`, `task-assignments`.

### Autorización por rol en creación (implementado)
Regla: *cualquiera crea una task asignada a sí mismo; solo privilegiados (ADMIN/CREATOR) la asignan a otro o la dejan sin asignar.*

- **Decisión (aplicada)**: vive como método del **domain service** `TaskAccessPolicy.canAssignTo(actor, assigneeId) = isPrivileged(actor) || assigneeId === actor.id` (misma forma que `canView`; `assigneeId === null` ⇒ sin asignar ⇒ solo privilegiados). **No** como método de `User` (acoplaría User↔Task y lo volvería un god-object de permisos). **Double dispatch no aplica** acá (no hay dos jerarquías de tipos; `Task` no tiene subtipos).
- **Si las reglas-por-rol proliferan**: recién ahí migrar `UserRole` (enum) a **roles polimórficos** (`AdminRole`/`UserRole`/`CreatorRole` con métodos de capacidad), con el costo de necesitar un factory para reconstruir la subclase desde `user_role.description`. Hoy sería prematuro (YAGNI).

---

## Mapa de `src/`

```
src/
  app.module.ts            # raíz: imports + APP_FILTER + APP_PIPE
  main.ts
  shared/domain/           # Actor, DomainError (kernel compartido)
  common/filters/          # DomainExceptionFilter (HTTP)
  auth/                    # placeholder + current-actor.decorator.ts
  prisma/                  # PrismaModule (@Global), PrismaService
  users/
    domain/                # User, UserRole, puertos (UserRepository, PasswordHasher), errores
    application/           # CreateUser, ChangePassword, ChangeUserRole
    infrastructure/        # persistence (in-memory, prisma), hashing (scrypt)
    dto/                   # CreateUserDto, ChangePasswordDto, ChangeUserRoleDto
    tests/                 # user-management.steps.ts, doubles/
    users.controller.ts | users.module.ts
  tasks/
    domain/                # Task, TaskAccessPolicy, errores
    application/           # CreateTask, ViewTask, ReassignTask
    infrastructure/        # persistence (in-memory, prisma)
    dto/                   # CreateTaskDto, ReassignTaskDto
    tests/                 # task-creation.steps.ts, user-permissions.steps.ts
    tasks.controller.ts | tasks.module.ts
specs/                     # *.feature (Gherkin)
prisma/schema.prisma
```
