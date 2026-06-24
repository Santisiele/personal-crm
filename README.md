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
- **Puertos**: `UserRepository` (con `findById` / `findByName`), `PasswordHasher`.
- **Casos de uso**: `CreateUser` (rechaza `name` duplicado con `UserNameTakenError` → 409; `name` es único), `ChangePassword`, `ChangeUserRole`.
- **Adaptadores**: `InMemoryUserRepository`, `PrismaUserRepository` (resuelve el rol contra `user_role.description`), `ScryptPasswordHasher`.
- **Endpoints** (`UsersController`):
  - `POST /users` — crear usuario (`CreateUserDto`).
  - `PATCH /users/me/password` — cambiar la propia contraseña (userId sale del `Actor`).
  - `PATCH /users/:id/role` — cambiar el rol.

### Contexto `tasks` (`src/tasks`)
- **Dominio**: `Task` lleva `id` (lo asigna el repositorio en el primer `save`; antes es `null`), `ownerId`, `assigneeId` (puede ser `null` = sin asignar), `title`, `description`, `dueDate` (fecha ISO `YYYY-MM-DD` o `null`), `companyId` (id de empresa o `null`) y `status` (enum `TaskStatus`: `PENDING` | `IN_PROGRESS` | `DONE`; default `PENDING` al crear). `changeStatus` transiciona el estado. **No modela** historial de asignaciones. `TaskStatus` vive en `domain/task-status.ts` (sus valores matchean las descripciones de `task_status`). `TaskAccessPolicy` (domain service) con `canView` (privilegiado o dueño), `canReassign` (solo dueño), `canChangeStatus` (dueño, asignado o privilegiado), `isVisibleInList` (dueño, asignado o privilegiado — para el listado), `canAssignTo` (uno mismo, o privilegiado para asignar a otro / dejar sin asignar) y `canArchive` (dueño o privilegiado).
- **Puertos**: `TaskRepository` (incluye `findById`, `updateStatus`, `findAll(filter?)` y `archive`). `TaskListFilter` = `{ assigneeId?, companyId? }`.
- **Casos de uso**: `CreateTask`, `ViewTask`, `ReassignTask`, `ArchiveTask`, `ChangeTaskStatus`, `ListTasks`.
- **Adaptadores**: `InMemoryTaskRepository` (asigna identidad con un contador), `PrismaTaskRepository`. El adaptador Prisma mapea `dueDate ↔ task.due_date`, `companyId ↔ task.company_id` (nullable) y `status ↔ task.status_id` resuelto por `task_status.description` (con fallback al status de menor id si la descripción no está seedeada). `findAll` filtra `deleted_at: null` + `company_id` en SQL y el `assigneeId` sobre el read model (vive en `task_assignment`).
- **Endpoints** (`TasksController`):
  - `POST /tasks` — crear tarea (`CreateTaskDto`: `title`, `description`, `assigneeId?`, `dueDate?`, `companyId?`). Omitir `assigneeId` → para uno mismo; `null` → sin asignar (solo privilegiados); un id → a ese usuario (solo privilegiados, salvo que sea uno mismo). `dueDate` se valida como fecha ISO; `companyId` se guarda tal cual (no se valida contra el contexto `companies`). Devuelve también `dueDate`, `companyId` y `status`.
  - `GET /tasks` — listar las tareas visibles del actor (dueño o asignado; privilegiados ven todas), excluyendo archivadas. Filtros opcionales `?assigneeId=` y `?companyId=` (`ListTasksQueryDto`).
  - `GET /tasks/:id` — ver tarea (autorizado por rol/ownership). Devuelve `dueDate`, `companyId` y `status`.
  - `PATCH /tasks/:id/assignee` — reasignar (`ReassignTaskDto`, solo el dueño).
  - `PATCH /tasks/:id/status` — transicionar el estado (`ChangeTaskStatusDto`: `status` ∈ `TaskStatus`). Dueño, asignado o privilegiado; 404 si no existe/archivada, 403 si no autorizado.
  - `POST /tasks/:id/archive` — archivar (borrado lógico, `ArchiveTaskDto`: `reason`). Setea `deleted_at`/`deleted_by` y registra la razón como un `task_activity` cuyo `activity_status` ('DELETED') la marca como borrado. La tarea archivada **deja de aparecer** en `findById`/`findAll` (ver/reasignar/cambiar estado/listar la omiten). Dueño o privilegiado.

### Contexto `contacts` (`src/contacts`)
- **Dominio**: `Contact` (id repo-asignado; `contactName`, `email?`, `birth?` como fecha ISO `YYYY-MM-DD`). `ContactNotFoundError`.
- **Casos de uso**: `CreateContact` (sin autorización — cualquiera crea un contacto, como `POST /users`).
- **Adaptadores**: `InMemoryContactRepository`, `PrismaContactRepository`.
- **Endpoint**: `POST /contacts` (`CreateContactDto`). El módulo exporta `CONTACT_REPOSITORY` para que `companies` lo reuse.

### Contexto `companies` (`src/companies`)
- **Dominio**: `Company` (id repo-asignado; `companyName`, `ownerId` = `created_by`, `cuit?`/`brand?`/`product?`/`origin?`). `CompanyAccessPolicy` (`canCreate`, `canLinkContacts` = solo ADMIN/CREATOR) + `CompanyAccessDeniedError`. `CompanyNotFoundError`. `CompanyContactLink` (vínculo `contact_x_company` con `roleInCompany?`/`phone?`).
- **Casos de uso**: `CreateCompany`, `LinkContactToCompany` (verifica que empresa y contacto existan).
- **Adaptadores**: in-memory + Prisma para `Company` y para el vínculo. Al crear, `status_id` = el `company_status` de menor id (default).
- **Endpoints** (`CompaniesController`):
  - `POST /companies` — crear empresa (**solo ADMIN/CREATOR**; el creador es el dueño).
  - `POST /companies/:id/contacts` — vincular un contacto existente (`LinkContactDto`: `contactId`, `roleInCompany?`, `phone?`). Solo privilegiados; 404 si la empresa o el contacto no existen. `CompaniesModule` importa `ContactsModule` para reusar el `ContactRepository`.

### Contexto `task-activities` (`src/task-activities`)
- **Dominio**: `TaskActivity` (id repo-asignado; `taskId`, `authorId` = actor, `activityDate` ISO, `actionType`/`status` por descripción, `description?`, `nextAction?`, `nextActionDate?`).
- **Casos de uso**: `LogTaskActivity` — carga la tarea (`TaskRepository` del contexto `tasks`), exige `TaskAccessPolicy.canView` (dueño o privilegiado), y guarda. `actionType`/`status` se resuelven contra `action_type`/`activity_status` por descripción.
- **Endpoint**: `POST /tasks/:taskId/activities` (`LogTaskActivityDto`). `TaskActivitiesModule` importa `TasksModule` (que ahora exporta `TASK_REPOSITORY`).

### Shared / common / auth
- `src/shared/domain/actor.ts` — **`Actor`** (`{ id, role }`), kernel compartido entre contextos.
- `src/shared/domain/domain-error.ts` — jerarquía `DomainError` → `NotFoundError` / `AuthenticationError` / `AuthorizationError` / `ConflictError` (usa `new.target.name`).
- `src/common/filters/domain-exception.filter.ts` — `DomainExceptionFilter` global: mapea **por categoría** (`NotFoundError`→404, `AuthenticationError`→401, `AuthorizationError`→403, `ConflictError`→409). Los controllers **no hacen try/catch**.
- `src/auth/` — **autenticación JWT real**. `POST /auth/login` (público) busca el usuario por `name`, verifica la contraseña (`ScryptPasswordHasher`) y emite un JWT `{ sub, role }` firmado con `jsonwebtoken` (secreto en `JWT_SECRET`, con fallback de dev). Un **guard global** (`JwtAuthGuard` vía `APP_GUARD`) verifica el Bearer y setea `request.user`; `@CurrentActor()` lo lee. Rutas públicas con `@Public()` (`POST /auth/login`, `POST /users`, `GET /`); **el resto exige token**. `UserRepository` ganó `findByName`; `name` es **único** (índice en DB), así que identifica sin ambigüedad.
- Scaffolding aún vacío: `task-assignments` (historial de asignaciones).

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
6. **Auth JWT** (implementado): el seam `@CurrentActor()` ahora lee `request.user` que setea el `JwtAuthGuard` global; se entra con `POST /auth/login` → Bearer token. `POST /users` y `GET /` son `@Public()` (bootstrap); el resto exige token. **Login por `name`**, que es **único** (`@unique` + índice `app_user_name_key`); `CreateUser` rechaza duplicados con `UserNameTakenError` (→409) antes de guardar, y la DB es el backstop. Se usó `jsonwebtoken` y **no** `@nestjs/jwt` (este arrastraba un `@nestjs/common` duplicado que rompía la DI de Nest).
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

- **e2e** (`test/app.e2e-spec.ts`): corre con **`pnpm test:e2e`** (config propia `test/jest-e2e.json`, fuera de `pnpm test`). Levanta el `AppModule` real **contra la DB** (carga `.env` vía `test/setup-e2e.ts`) y ejercita el stack completo con **auth JWT real**: cada usuario hace `POST /auth/login` y manda Bearer token; cubre tareas, users, contactos, empresas, el vínculo, actividades y login (200/401). **Crea y borra sus propias filas** (la dev DB es descartable); usa un sufijo único por corrida en los nombres de usuario.

---

## Comandos

```bash
pnpm install
pnpm build          # nest build && tsc-alias  (output a dist/)
pnpm start:dev      # watch mode
pnpm start:prod     # node dist/main
pnpm test           # jest (integración skippeada salvo TEST_DATABASE_URL)
pnpm test:e2e       # jest e2e (test/jest-e2e.json) — AppModule real contra la DB, self-cleaning
pnpm run format     # prettier --write
pnpm run lint       # eslint --fix  (limpio: 0 errores / 0 warnings)
```

---

## Próximos pasos / deuda conocida

- **Login identifier**: hoy se entra por `name` (ya único). Un `email`/`username` dedicado sería más amigable que el nombre de la persona, pero funciona. Setear `JWT_SECRET` en cualquier entorno real (el fallback es solo para dev).
- **DB sin migraciones versionadas**: el índice único `app_user_name_key` se aplicó a mano sobre la dev DB para matchear el `@unique` del schema. Si en algún momento se adopta `prisma migrate`, formalizarlo.
- **`Task.status` en el dominio** (implementado): el agregado modela `status` (`TaskStatus`: `PENDING` | `IN_PROGRESS` | `DONE`), default `PENDING` al crear, y se transiciona vía `PATCH /tasks/:id/status`. El adaptador Prisma resuelve `task_status` por descripción (fallback al de menor id si la descripción no está seedeada), así que conviene seedear las descripciones `PENDING`/`IN_PROGRESS`/`DONE` para que el flujo persista el estado correcto.
- **e2e**: cubre `GET /`, tareas (crear/ver/reasignar/archivar con sus 200/201/204/400/403/404), `users` (password/rol), `contacts`, `companies` y el vínculo contacto↔empresa. Todo contra la DB real y self-cleaning.
- **Lookups del archivado**: el adaptador resuelve `activity_status='DELETED'` y `action_type='ARCHIVE'` por descripción y falla si faltan (hay que seedearlos). Cuando se modele `task_activity` en serio, formalizar estos lookups.
- Contexto scaffolding vacío: `task-assignments` (historial de asignaciones).

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
  auth/                    # JWT: login, JwtAuthGuard (global), @Public, @CurrentActor
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
    application/           # CreateTask, ViewTask, ReassignTask, ArchiveTask
    infrastructure/        # persistence (in-memory, prisma)
    dto/                   # CreateTaskDto, ReassignTaskDto, ArchiveTaskDto
    tests/                 # task-creation.steps.ts, task-archiving.steps.ts, user-permissions.steps.ts
    tasks.controller.ts | tasks.module.ts
  contacts/
    domain/ application/ infrastructure/ dto/ tests/   # Contact, CreateContact
    contacts.controller.ts | contacts.module.ts
  companies/
    domain/                # Company, CompanyAccessPolicy, CompanyContactLink, errores
    application/           # CreateCompany, LinkContactToCompany
    infrastructure/ dto/ tests/
    companies.controller.ts | companies.module.ts
  task-activities/         # TaskActivity, LogTaskActivity (POST /tasks/:id/activities)
test/                      # app.e2e-spec.ts (e2e real-DB, JWT), setup-e2e.ts, jest-e2e.json
specs/                     # *.feature (Gherkin)
prisma/schema.prisma
```
