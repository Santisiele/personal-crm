# backend-crm

Backend de un CRM en **NestJS + Prisma (PostgreSQL)**, construido con **arquitectura hexagonal (ports & adapters)** y **BDD ejecutable** (jest-cucumber). Este README es el documento de contexto del proyecto: resume las reglas, decisiones de diseño y el estado actual para retomar el trabajo.

> **Monolito con frontend.** El repo incluye además un **frontend React + TypeScript** en [`web/`](web/) (Vite + Mantine + FullCalendar) que consume esta API. En producción el propio Nest lo sirve como estático bajo **`/app`**, así que un solo proceso expone la API (en la raíz) y la SPA (en `/app`). Ver [Frontend (`web/`)](#frontend-web) y [`web/README.md`](web/README.md).

---

## Stack

- **NestJS 11**, TypeScript (`module/moduleResolution: nodenext`, salida CommonJS).
- **Prisma 7** con `@prisma/adapter-pg` (driver adapter sobre `pg`).
- **PostgreSQL** en Supabase (free plan) — ver [Base de datos](#base-de-datos).
- **Jest 30** + **jest-cucumber** para specs BDD. **class-validator/class-transformer** para DTOs.
- **@nestjs/swagger** (OpenAPI) con su CLI plugin: documentación interactiva en **`/docs`**.
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
- **Dominio**: `User` (la identidad la asigna el repositorio en el primer `save` vía `assignId`; antes el id es `null`), enum `UserRole` (`USER` | `ADMIN` | `CREATOR`). `UserAccessPolicy` (domain service) con `canList` (solo privilegiado) y `canView` (privilegiado o el propio usuario).
- **Puertos**: `UserRepository` (`save`, `findById`, `findByName`, `findAll`), `PasswordHasher`.
- **Casos de uso**: `CreateUser` (rechaza `name` duplicado con `UserNameTakenError` → 409; `name` es único), `ChangePassword`, `ChangeUserRole`, `ListUsers`, `ViewUser`, `DeactivateUser` (baja lógica, solo privilegiado).
- **Vista segura**: `UserView` (`{ id, name, role }`) + `toUserView(user)` — **nunca** expone el hash de contraseña. Las queries (`ListUsers`/`ViewUser`) devuelven `UserView`, no el agregado.
- **Adaptadores**: `InMemoryUserRepository`, `PrismaUserRepository` (resuelve el rol contra `user_role.description`; `findAll` ordena por `id`), `ScryptPasswordHasher`.
- **Errores de dominio**: `UserNotFoundError` (→404), `UserAccessDeniedError` (→403).
- **Endpoints** (`UsersController`):
  - `POST /users` — **registro público**; crea **siempre un `USER`**. El `CreateUserDto` **no acepta `role`** (con `forbidNonWhitelisted`, mandar `role` da `400`), así que un caller anónimo no puede fabricarse una cuenta privilegiada. La elevación pasa solo por `PATCH /users/:id/role`. `409` si el nombre ya existe.
  - `PATCH /users/me/password` — cambiar la propia contraseña (userId sale del `Actor`).
  - `PATCH /users/:id/role` — cambiar el rol; **autorizado por jerarquía** (`UserAccessPolicy.canAssignRole`). El **CREATOR** asigna cualquier rol; un **ADMIN** está confinado a usuarios comunes y no puede otorgar por encima de `USER` (no puede crear un par ni degradar a un superior); cualquier otro caso (incluido un `USER` sobre sí mismo) → `403`. `404` si el usuario no existe. El controller pasa el `Actor` al caso de uso, que carga el target (su rol actual es parte de la decisión) antes de chequear la política.
  - `GET /users` — listar usuarios; **solo privilegiado** (ADMIN/CREATOR), si no `403`. Devuelve `UserView[]`.
  - `GET /users/:id` — ver un usuario; **privilegiado o el propio usuario**, si no `403`; `404` si no existe. Devuelve `UserView`.
  - `DELETE /users/:id` — **baja lógica** (deactivate); **solo privilegiado** (ADMIN/CREATOR), si no `403`; `404` si no existe; `204` si ok. Setea `deleted_at`/`deleted_by`: el usuario **deja de aparecer** en `GET /users` y no puede loguear (`findByName` lo omite), pero **sigue siendo visible por id** (`findById` lo resuelve) para que las referencias históricas (p. ej. tareas que creó) sigan viéndose. Nunca borra la fila.

#### Gestión de roles (`RolesController`, **solo CREATOR**)
- **Dominio**: `Role` (id repo-asignado; `description`, la clave técnica del `user_role`). Puerto `RoleRepository` (`save`, `findAll`, `findByDescription`). `RoleAlreadyExistsError` (→409). `UserAccessPolicy.canManageRoles` = solo CREATOR.
- **Casos de uso**: `CreateRole` (rechaza descripción duplicada → 409), `ListRoles`. Adaptadores in-memory + Prisma (escriben/leen la tabla `user_role`).
- **Endpoints**: `POST /roles` (crear; 409 si duplicado, 403 si no CREATOR), `GET /roles` (listar; 403 si no CREATOR). Las descripciones son **claves técnicas en inglés** (la API es en inglés; la traducción es del front).

### Contexto `tasks` (`src/tasks`)
- **Dominio**: `Task` lleva `id` (lo asigna el repositorio en el primer `save`; antes es `null`), `ownerId`, `assigneeId` (puede ser `null` = sin asignar), `title`, `description`, `dueDate` (fecha ISO `YYYY-MM-DD` o `null`), `companyId` (id de empresa o `null`) y `status` (enum `TaskStatus`: `PENDING` | `IN_PROGRESS` | `DONE`; default `PENDING` al crear). `changeStatus` transiciona el estado. **No modela** historial de asignaciones. `TaskStatus` vive en `domain/task-status.ts` (sus valores matchean las descripciones de `task_status`). `TaskAccessPolicy` (domain service) con `canView` (privilegiado o dueño), `canReassign` (solo dueño), `canChangeStatus` (dueño, asignado o privilegiado), `isVisibleInList` (dueño, asignado o privilegiado — para el listado), `canAssignTo` (uno mismo, o privilegiado para asignar a otro / dejar sin asignar) y `canArchive` (dueño o privilegiado).
- **Puertos**: `TaskRepository` (incluye `findById`, `updateStatus`, `findAll(filter?)` y `archive`). `TaskListFilter` = `{ assigneeId?, companyId? }`.
- **Casos de uso**: `CreateTask`, `ViewTask`, `ReassignTask`, `ArchiveTask`, `ChangeTaskStatus`, `ListTasks`.
- **Adaptadores**: `InMemoryTaskRepository` (asigna identidad con un contador), `PrismaTaskRepository`. El adaptador Prisma mapea `dueDate ↔ task.due_date`, `companyId ↔ task.company_id` (nullable) y `status ↔ task.status_id` resuelto por `task_status.description` (con fallback al status de menor id si la descripción no está seedeada). `findAll` filtra `deleted_at: null` + `company_id` en SQL y el `assigneeId` sobre el read model (vive en `task_assignment`).
- **Endpoints** (`TasksController`):
  - `POST /tasks` — crear tarea (`CreateTaskDto`: `title`, `description`, `assigneeId?`, `dueDate?`, `companyId?`). Omitir `assigneeId` → para uno mismo; `null` → sin asignar (solo privilegiados); un id → a ese usuario (solo privilegiados, salvo que sea uno mismo). `dueDate` se valida como fecha ISO; `companyId` se guarda tal cual (no se valida contra el contexto `companies`). La respuesta incluye `title`, `description`, `dueDate`, `companyId` y `status`.
  - `GET /tasks` — listar las tareas visibles del actor (dueño o asignado; privilegiados ven todas), excluyendo archivadas. Filtros opcionales `?assigneeId=` y `?companyId=` (`ListTasksQueryDto`).
  - `GET /tasks/:id` — ver tarea (autorizado por rol/ownership). Devuelve `title`, `description`, `dueDate`, `companyId` y `status`.
  - `PATCH /tasks/:id` — **editar contenido** (`EditTaskDto`: `title?`, `description?`, `dueDate?`). Edición **parcial** (omitir un campo lo deja igual; `dueDate: null` lo limpia). Dueño, asignado o privilegiado (`TaskAccessPolicy.canEdit`); `403` si no; `404` si no existe/archivada. Es lo que habilita **reprogramar una tarea moviéndola en el calendario**. El agregado gana `edit()` (sus `title`/`description`/`dueDate` pasan a privados con getters) y el repositorio `update()`, distinto de `save()` cuya rama con id es la reasignación.
  - `PATCH /tasks/:id/assignee` — reasignar (`ReassignTaskDto`, solo el dueño).
  - `PATCH /tasks/:id/status` — transicionar el estado (`ChangeTaskStatusDto`: `status` ∈ `TaskStatus`). Dueño, asignado o privilegiado; 404 si no existe/archivada, 403 si no autorizado.
  - `POST /tasks/:id/archive` — archivar (borrado lógico, `ArchiveTaskDto`: `reason`). Setea `deleted_at`/`deleted_by` y registra la razón como un `task_activity` cuyo `activity_status` ('DELETED') la marca como borrado. La tarea archivada **deja de aparecer** en `findById`/`findAll` (ver/reasignar/cambiar estado/listar la omiten). Dueño o privilegiado.

### Contexto `contacts` (`src/contacts`)
- **Dominio**: `Contact` (id repo-asignado; `contactName`, `email?`, `birth?` como fecha ISO `YYYY-MM-DD`). Atributos privados con getters (como `User`); la edición pasa por `Contact.update`, que aplica un cambio parcial (solo toca los atributos provistos). `ContactNotFoundError`.
- **Puertos**: `ContactRepository` (`save`, `findById`, `findAll`).
- **Casos de uso**: `CreateContact`, `ListContacts`, `ViewContact`, `UpdateContact` y `DeleteContact` — **todos sin autorización** (cualquiera lee/crea/edita/borra un contacto, como `POST /users`). `ViewContact`/`UpdateContact`/`DeleteContact` lanzan `ContactNotFoundError` (→404) si el id no existe. `DeleteContact` es **baja lógica**: setea `deleted_at`/`deleted_by`, el contacto sale del listado pero sigue siendo visible por id.
- **Adaptadores**: `InMemoryContactRepository`, `PrismaContactRepository` (el `save` despacha por identidad: sin id → INSERT; con id → UPDATE in-place, reusado por la edición).
- **Endpoints** (`ContactsController`):
  - `POST /contacts` — crear contacto (`CreateContactDto`).
  - `GET /contacts` — listar todos.
  - `GET /contacts/:id` — ver uno (404 si no existe).
  - `PATCH /contacts/:id` — editar `contactName`/`email`/`birth` (`UpdateContactDto`, parcial y validado; 404 si no existe).
  - `DELETE /contacts/:id` — **baja lógica** (cualquier autenticado); `404` si no existe; `204` si ok.
- El módulo exporta `CONTACT_REPOSITORY` para que `companies` lo reuse.

### Contexto `companies` (`src/companies`)
- **Dominio**: `Company` (id repo-asignado; `companyName`, `ownerId` = `created_by`, `cuit?`/`brand?`/`product?`/`origin?`, `status?` = descripción de `company_status`). Métodos `update(...)` (edita los campos presentes; `null` limpia, omitir no toca) y `changeStatus(...)`. `CompanyAccessPolicy` (`canCreate`, `canLinkContacts`, `canEdit`, `canChangeStatus`, `canDelete` = solo ADMIN/CREATOR) + `CompanyAccessDeniedError`. `CompanyNotFoundError`, `CompanyStatusNotFoundError`. `CompanyContactLink` (vínculo `contact_x_company` con `roleInCompany?`/`phone?`).
- **Casos de uso**: `CreateCompany`, `LinkContactToCompany` (verifica que empresa y contacto existan), `ListCompanies`, `ViewCompany` (hidrata los contactos vinculados vía `CompanyContactLinkRepository` + `ContactRepository`), `EditCompany`, `ChangeCompanyStatus`, `DeleteCompany` (baja lógica, solo privilegiado).
- **Puertos/Adaptadores**: in-memory + Prisma para `Company` (`save`/`findById`/`findAll`) y para el vínculo (`save`/`findByCompanyId`). Al crear, `status_id` = el `company_status` de menor id (default); al transicionar, se resuelve el `status_id` por descripción (404 `CompanyStatusNotFoundError` si no existe). `save` despacha por identidad: sin id → INSERT, con id → UPDATE (editar/transicionar).
- **Endpoints** (`CompaniesController`):
  - `POST /companies` — crear empresa (**solo ADMIN/CREATOR**; el creador es el dueño).
  - `GET /companies` — listar empresas (cualquier autenticado).
  - `GET /companies/:id` — ver una empresa con sus contactos vinculados (cualquier autenticado); 404 si no existe.
  - `POST /companies/:id/contacts` — vincular un contacto existente (`LinkContactDto`: `contactId`, `roleInCompany?`, `phone?`). Solo privilegiados; 404 si la empresa o el contacto no existen. `CompaniesModule` importa `ContactsModule` para reusar el `ContactRepository`.
  - `PATCH /companies/:id` — editar campos (`EditCompanyDto`: `companyName?`/`cuit?`/`brand?`/`product?`/`origin?`). Solo privilegiados; 404 si no existe.
  - `PATCH /companies/:id/status` — transicionar el estado (`ChangeCompanyStatusDto`: `status` = descripción). Solo privilegiados; 404 si no existe.
  - `DELETE /companies/:id` — **baja lógica** (solo privilegiados); `404` si no existe; `204` si ok. La empresa sale del listado pero sigue siendo visible por id.

#### Gestión de estados de empresa (`CompanyStatusesController`, **solo CREATOR**)
- **Dominio**: `CompanyStatus` (id repo-asignado; `description` = valor de negocio **libre**, puede ser español). Puerto `CompanyStatusRepository` (`save`, `findAll`, `findByDescription`). `CompanyStatusAlreadyExistsError` (→409). `CompanyAccessPolicy.canManageStatuses` = solo CREATOR.
- **Casos de uso**: `CreateCompanyStatus` (rechaza duplicado → 409), `ListCompanyStatuses`. Adaptadores in-memory + Prisma (tabla `company_status`).
- **Endpoints**: `POST /company-statuses` (crear; 409 si duplicado, 403 si no CREATOR), `GET /company-statuses` (listar; 403 si no CREATOR).

### Contexto `task-activities` (`src/task-activities`)
- **Dominio**: `TaskActivity` (id repo-asignado; `taskId`, `authorId` = actor, `activityDate` ISO, `actionType`/`status` por descripción, `description?`, `nextAction?`, `nextActionDate?`).
- **Puertos**: `TaskActivityRepository` (`save`, `findByTaskId` ordenado most-recent first).
- **Casos de uso**:
  - `LogTaskActivity` — carga la tarea (`TaskRepository` del contexto `tasks`), exige `TaskAccessPolicy.canView` (dueño o privilegiado), y guarda. `actionType`/`status` se resuelven contra `action_type`/`activity_status` por descripción.
  - `ViewActivityLog` — carga la tarea, exige `TaskAccessPolicy.canView` (mismo gate que loguear) y devuelve el log completo, most-recent first (por `activityDate` y luego `id`, desc). 404 si la tarea no existe. Espeja a `ViewAssignmentHistory` del contexto `task-assignments`.
- **Adaptadores**: `InMemoryTaskActivityRepository` y `PrismaTaskActivityRepository`. Este último, al leer, resuelve `actionType`/`status` contra los lookups `action_type`/`activity_status` por id (incluidos en la query) y formatea `activity_date`/`next_action_date` a fecha ISO `YYYY-MM-DD`.
- **Endpoints** (`TaskActivitiesController`):
  - `POST /tasks/:taskId/activities` — loguear una actividad (`LogTaskActivityDto`).
  - `GET /tasks/:taskId/activities` — leer el log de la tarea, most-recent first (autorizado por la política de la tarea: dueño o privilegiado; 403 si no, 404 si la tarea no existe).
- `TaskActivitiesModule` importa `TasksModule` (que ahora exporta `TASK_REPOSITORY`).

### Contexto `task-assignments` (`src/task-assignments`)
- **Dominio**: `TaskAssignment` (id repo-asignado; `taskId`, `assigneeId`, `assignedById`, `status`, `assignedAt`). Es **una entrada del historial** de asignaciones de una tarea. `AssignmentStatus` (enum `PENDING | ACCEPTED | REJECTED`; sus descripciones son los valores del lookup `assignment_status`). El agregado expone `accept()` / `reject()` (transiciones del ciclo de vida) e `isAssignedTo(userId)`. `TaskAssignmentNotFoundError` (→404).
- **Puertos**: `TaskAssignmentRepository` (`save`, `findByTaskId` ordenado most-recent first, `findById`).
- **Casos de uso**:
  - `ViewAssignmentHistory` — carga la tarea (`TaskRepository` del contexto `tasks`), exige `TaskAccessPolicy.canView` (dueño o privilegiado) y devuelve el historial completo. 404 si la tarea no existe.
  - `RespondToAssignment` — el **assignee** acepta o rechaza **su** asignación (`AssignmentResponse.ACCEPT | REJECT`). Solo el assignee puede (invariante del agregado vía `isAssignedTo`, no de `TaskAccessPolicy`) → `AccessDeniedError` (403) si no; 404 si la asignación no existe.
- **Adaptadores**: `InMemoryTaskAssignmentRepository` (identidad con contador) y `PrismaTaskAssignmentRepository`. Este último mapea `assigneeId↔user_id`, `assignedById↔assigned_by`, `assignedAt↔assigned_at`, y resuelve `status` contra `assignment_status` **por descripción** (con fallback al `assignment_status` de menor id si la descripción no está seedeada, igual que el default del adaptador de `tasks`). `save` despacha por identidad: sin id → INSERT de una fila nueva del historial; con id → UPDATE del `status_id` en su lugar (accept/reject).
- **Endpoints** (`TaskAssignmentsController`, prefijo `tasks/:taskId/assignments`):
  - `GET /tasks/:taskId/assignments` — historial completo, most-recent first (autorizado por la política de la tarea).
  - `POST /tasks/:taskId/assignments/:id/accept` — el assignee acepta (200).
  - `POST /tasks/:taskId/assignments/:id/reject` — el assignee rechaza (200).
- **Relación con `tasks`**: este contexto **lee/extiende el historial**; `tasks` solo actualiza la asignación más reciente en su lugar al reasignar (eso no se toca acá). `TaskAssignmentsModule` importa `TasksModule` (reusa `TASK_REPOSITORY` y `TaskAccessPolicy`).

### Shared / common / auth
- `src/shared/domain/actor.ts` — **`Actor`** (`{ id, role }`), kernel compartido entre contextos.
- `src/shared/domain/domain-error.ts` — jerarquía `DomainError` → `NotFoundError` / `AuthenticationError` / `AuthorizationError` / `ConflictError` (usa `new.target.name`).
- `src/common/filters/domain-exception.filter.ts` — `DomainExceptionFilter` global: mapea **por categoría** (`NotFoundError`→404, `AuthenticationError`→401, `AuthorizationError`→403, `ConflictError`→409). Los controllers **no hacen try/catch**.
- `src/auth/` — **autenticación JWT real con access + refresh**. `POST /auth/login` (público) busca el usuario por `name`, verifica la contraseña (`ScryptPasswordHasher`) y emite un **par de tokens**: un **access token** corto (`exp` 1h por defecto) y un **refresh token** largo (7d por defecto), ambos firmados con `jsonwebtoken` y distinguidos por un claim `purpose` (`access`/`refresh`). El puerto `TokenIssuer` ahora **emite y verifica** ambos (`issueAccessToken`/`issueRefreshToken`/`verifyAccessToken`/`verifyRefreshToken`); el adaptador `JwtTokenIssuer` traduce cualquier fallo (expirado, manipulado, de tipo equivocado) a un `InvalidTokenError` (`AuthenticationError` → 401). `POST /auth/refresh` (público) valida un refresh token y emite un access token fresco vía el caso de uso framework-free `RefreshAccessToken` (cableado con `useFactory`). `GET /auth/me` (autenticado) devuelve la vista segura del usuario actual (`{ id, name, role }`) reusando `ViewUser` (un usuario siempre puede verse a sí mismo), para que el front tenga el nombre que el token no lleva. Un **guard global** (`JwtAuthGuard` vía `APP_GUARD`) verifica el Bearer **a través del puerto** (no `jsonwebtoken` directo) y setea `request.user`; un token faltante/expirado/inválido da 401. Rutas públicas con `@Public()` (`POST /auth/login`, `POST /auth/refresh`, `POST /users`, `GET /`); **el resto exige token**. TTLs configurables vía `JWT_ACCESS_TTL_SECONDS`/`JWT_REFRESH_TTL_SECONDS`. `UserRepository` ganó `findByName`; `name` es **único** (índice en DB), así que identifica sin ambigüedad.

### Configuración transversal (`AppModule`)
- `APP_FILTER` → `DomainExceptionFilter`.
- `APP_PIPE` → `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- `PrismaModule` es `@Global` y exporta `PrismaService` (extiende `PrismaClient`).
- **Swagger/OpenAPI**: en `main.ts` se monta `SwaggerModule` en **`/docs`** con un esquema Bearer JWT global (`access-token`) y `persistAuthorization`. El **CLI plugin** de `@nestjs/swagger` (`nest-cli.json`, `introspectComments: true`) infiere los schemas de los DTOs desde class-validator + JSDoc, así los DTOs quedan documentados sin decorar a mano; los controllers llevan `@ApiTags`/`@ApiOperation`/`@ApiResponse`/`@ApiBearerAuth`. Las 4 rutas `@Public()` (`GET /`, login, refresh, `POST /users`) quedan sin auth.

---

## Frontend (`web/`)

SPA en **React 18 + TypeScript** (Vite), **Mantine** para UI y **FullCalendar** para el calendario, con **TanStack Query** para el estado del servidor. Consume esta API; la doc completa está en [`web/README.md`](web/README.md). Resumen de decisiones:

- **Monolito.** En prod, `main.ts` sirve `web/dist` como estático bajo **`/app`** vía `useStaticAssets` de `platform-express` (no `ServeStaticModule`, que no resolvía `ApplicationConfig` bajo pnpm). La API mantiene la raíz, así que las rutas de cliente no colisionan con las de la API. La SPA usa **hash routing** (`/app/#/...`), por lo que el server solo sirve `index.html` en `/app/` y **no hace falta fallback de deep-links**.
- **CORS.** `main.ts` hace `enableCors` para que el navegador (el dev server de Vite en otro origen, o mismo origen en prod) pueda mandar el header `Authorization`. Orígenes configurables con `CORS_ORIGIN`.
- **Carga de `.env`.** `main.ts` importa `dotenv/config` **antes** de que nada lea `process.env` (`PrismaService` resuelve `DATABASE_URL` al construirse). Antes no se cargaba y las queries fallaban con un error SASL. `dotenv` pasó a `dependencies`.
- **Auth en el cliente.** Interceptor de Axios que adjunta el access token y, ante un `401`, canjea el refresh token en `POST /auth/refresh` (single-flight) y reintenta; si el refresh falla, cierra la sesión. Un contexto de React expone el usuario (`GET /auth/me`) y guards de ruta por rol.
- **Calendario.** Vistas mes/semana; click para crear, click en evento para editar, y **drag para reprogramar** (`PATCH /tasks/:id`). Las tareas se colorean **por persona** (color determinístico por id); los privilegiados ven las tareas de todo el equipo con leyenda de nombres y un toggle dueño/asignado.
- **Gestión de usuarios y permisos.** Directorio, asignación de roles (**solo CREATOR**, espejando la regla de la API), alta y baja lógica. Más dashboard con métricas (vencidas/hoy/en progreso/completadas) y cambio de la propia contraseña.
- **Contactos y empresas.** Contactos (alta/edición/baja, abierto a cualquier autenticado como la API) y empresas (lista para todos; alta/edición/estado/baja solo privilegiados), con el detalle de empresa mostrando y permitiendo vincular contactos, y un ABM de estados de empresa solo para CREATOR.
- **i18n.** Las claves técnicas de la API (estados, roles) se traducen a español **solo para mostrar** (`web/src/labels.ts`); los datos libres se muestran tal cual. Mismo criterio que el backend (API en inglés, traducción en el front).

El backend excluye `web/` de su `tsconfig` para que el compilador de Nest no toque el front.

---

## Decisiones de diseño clave (el *por qué*)

1. **Identidad la asigna el repositorio.** El dominio no inventa ids; los crea la DB (autoincrement). `User.assignId` solo se permite una vez.
2. **`Task` lleva lo justo para autorizar y crear.** Identidad, `ownerId`, `assigneeId` (nullable), `title` y `description`; no modela historial ni estados. `PrismaTaskRepository.save` **despacha por identidad**: sin id → INSERT de la fila `task` (+ un `task_assignment` opcional si tiene assignee); con id → reasignación de una tarea existente. Mapeo: `ownerId ↔ task.created_by`; `assigneeId ↔ user_id` del `task_assignment` más reciente (si no hay, cae al owner **en la lectura**). Reasignar **actualiza la asignación más reciente en su lugar** (no apila historial). Al crear, `assigned_by = created_by` porque el dueño es quien asigna (la política lo garantiza). Como el agregado no modela estados, las filas que requieren uno usan el `status` de menor id como default.
3. **Hasher con `scrypt` nativo** (`ScryptPasswordHasher`) para no sumar dependencias nativas (bcrypt/argon2). Salt aleatorio por hash, comparación constante.
4. **Errores → HTTP por polimorfismo**, no por enumerar clases. Agregar un error nuevo solo requiere extender la base correcta; el filtro no se toca (Open/Closed).
5. **`Actor` en shared kernel** para que `users` no dependa de `tasks`.
6. **Auth JWT** (implementado): el seam `@CurrentActor()` ahora lee `request.user` que setea el `JwtAuthGuard` global; se entra con `POST /auth/login` → par access/refresh. El **access token expira** (`exp` 1h) y el **refresh token** (7d) se canjea en `POST /auth/refresh` por uno fresco; ambos son JWT stateless con un claim `purpose` que impide usar uno como el otro. La **verificación de tokens vive en el puerto `TokenIssuer`** (no en el guard), así el guard depende de una abstracción y los escenarios BDD pueden inyectar un TTL cero para probar el rechazo de un token expirado. `POST /users`, `GET /` y `POST /auth/refresh` son `@Public()`; el resto exige token. **Login por `name`**, que es **único** (`@unique` + índice `app_user_name_key`); `CreateUser` rechaza duplicados con `UserNameTakenError` (→409) antes de guardar, y la DB es el backstop. Se usó `jsonwebtoken` y **no** `@nestjs/jwt` (este arrastraba un `@nestjs/common` duplicado que rompía la DI de Nest).
7. **Alias `@` + `tsc-alias`** porque `tsc` no reescribe los alias en el output CommonJS; sin esto, `require('@/..')` rompería en runtime.
8. **Toda baja es lógica (soft-delete).** Nunca se borra físicamente: `users`, `contacts` y `companies` (igual que `tasks`/archive) marcan `deleted_at`/`deleted_by`. El registro **sale de los listados** (`findAll`) pero **sigue resolviéndose por id** (`findById`), para que las referencias históricas (p. ej. tareas de un usuario dado de baja) sigan viéndose; en `users` también sale de `findByName` para bloquear el login. La autorización sigue la política de cada contexto (privilegiado para users/companies; abierto para contacts). El soft-delete vive a nivel **repositorio** (método `softDelete`), no en el agregado, mismo criterio que el `archive` de `tasks`.

---

## Base de datos

- `DATABASE_URL` (en `.env`) apunta a una **Postgres de Supabase (free)** vía session pooler. Es técnicamente "producción" pero se trata como **DB de dev descartable** (vacía; se llena y se limpia después).
- La tabla `user_role` está seedeada: `1:USER, 2:ADMIN, 3:CREATOR`. El `PrismaUserRepository` resuelve roles por `user_role.description`.
- Esquema en `prisma/schema.prisma`. Tablas relevantes: `app_user`, `user_role`, `task`, `task_assignment`, `task_status`, `assignment_status`, `task_activity`, `company`, `contact`, etc.
- **Seed** (`prisma/seed.ts`, idempotente, `pnpm db:seed`): llena las tablas de lookup para que crear users/tareas funcione de una, y **bootstrapea un `CREATOR`** (configurable con `BOOTSTRAP_CREATOR_NAME`/`BOOTSTRAP_CREATOR_PASSWORD`) para que un sistema nuevo tenga quién asigne roles — sin él, como el registro solo crea `USER`, nadie podría elevarse. El hash se genera en el mismo formato que `ScryptPasswordHasher`, así que el bootstrap creator loguea normalmente. Es idempotente: no pisa un usuario existente con ese nombre. Claves **técnicas en inglés** para los enum-bound (`user_role`, `task_status`, `assignment_status`, `activity_status`, `action_type`) porque el código las matchea contra los enums del dominio; y valores de negocio **en español** para `company_status` (`Prospecto`, `Contactado`, `Negociación`, `Cliente`, `Inactivo`), que es libre. El seed **nunca borra** filas (upsert por descripción). Criterio: API/contrato en inglés, traducción en el front; solo lo realmente libre/creado por el usuario va en español.

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
pnpm db:seed        # seed idempotente de las tablas de lookup (status/roles)
pnpm build          # nest build && tsc-alias  (output a dist/)
pnpm start:dev      # watch mode → Swagger UI en http://localhost:3000/docs
pnpm start:prod     # node dist/main
pnpm test           # jest (integración skippeada salvo TEST_DATABASE_URL)
pnpm test:e2e       # jest e2e (test/jest-e2e.json) — AppModule real contra la DB, self-cleaning
pnpm run format     # prettier --write
pnpm run lint       # eslint --fix  (limpio: 0 errores / 0 warnings)
```

**Frontend** (`web/`, ver [`web/README.md`](web/README.md)):

```bash
cd web
pnpm install
cp .env.example .env   # VITE_API_URL=http://localhost:3000 en dev
pnpm dev               # dev server en http://localhost:5173/app/
pnpm build             # tsc --noEmit && vite build (output a web/dist/)
```

Para el **monolito en prod**: `cd web && pnpm build` y luego `pnpm start:prod` desde la raíz — Nest sirve la SPA en `http://localhost:3000/app/` y la API en la raíz. En dev se corren los dos procesos (Nest `start:dev` + Vite `dev`) y la SPA pega a la API vía `VITE_API_URL` con CORS.

---

## Próximos pasos / deuda conocida

- **Login identifier**: hoy se entra por `name` (ya único). Un `email`/`username` dedicado sería más amigable que el nombre de la persona, pero funciona. Setear `JWT_SECRET` en cualquier entorno real (el fallback es solo para dev).
- **DB sin migraciones versionadas**: el índice único `app_user_name_key` se aplicó a mano sobre la dev DB para matchear el `@unique` del schema. Si en algún momento se adopta `prisma migrate`, formalizarlo.
- **Columnas de baja lógica (`deleted_at`/`deleted_by`)**: se agregaron al schema en `app_user`, `contact` y `company` (la `task` ya las tenía). Como no hay migraciones versionadas, **aplicarlas a mano sobre la dev DB** antes de correr e2e/integración, si no las queries de baja/listado fallan:
  ```sql
  ALTER TABLE app_user ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by bigint;
  ALTER TABLE contact  ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by bigint;
  ALTER TABLE company  ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by bigint;
  ```
- **`Task.status` en el dominio** (implementado): el agregado modela `status` (`TaskStatus`: `PENDING` | `IN_PROGRESS` | `DONE`), default `PENDING` al crear, y se transiciona vía `PATCH /tasks/:id/status`. El adaptador Prisma resuelve `task_status` por descripción (fallback al de menor id si la descripción no está seedeada), así que conviene seedear las descripciones `PENDING`/`IN_PROGRESS`/`DONE` para que el flujo persista el estado correcto.
- **Refresh stateless (sin revocación)**: el refresh token es un JWT firmado sin store en servidor, así que **no se puede revocar** antes de su `exp` (logout solo descarta el token en el cliente). Si hace falta revocación/rotación (logout server-side, detección de reuso), recién ahí agregar un store de refresh tokens detrás del puerto `TokenIssuer` (el escenario lo pediría primero).
- **e2e**: cubre `GET /`, tareas (crear/ver/reasignar/archivar/estado/listar), `users` (password/rol + directorio + baja lógica), `contacts` (alta/lista/detalle/edición/baja lógica), `companies` (alta/lista/detalle/edición/estado/baja lógica) y el vínculo contacto↔empresa, las **actividades de tarea** (loguear 201/403 y leer el log 200 most-recent first / 403), el **historial de asignaciones** (`test/task-assignments.e2e-spec.ts`: GET historial 200/403/404, accept/reject 200/403/404) y el **ciclo de tokens de auth** (`test/auth.e2e-spec.ts`: login con par access/refresh, `POST /auth/refresh`, 401 de tokens expirados/manipulados/inválidos). Todo contra la DB real y self-cleaning con sufijo único por corrida.
- **Lookups del archivado**: el adaptador resuelve `activity_status='DELETED'` y `action_type='ARCHIVE'` por descripción y falla si faltan (hay que seedearlos). Cuando se modele `task_activity` en serio, formalizar estos lookups.
- **Lookups de `assignment_status`**: el contexto `task-assignments` resuelve `assignment_status` por descripción (`PENDING`/`ACCEPTED`/`REJECTED`). Conviene **seedear** esas tres filas. Al crear una asignación, si la descripción falta cae al `assignment_status` de menor id (mismo default que el adaptador de `tasks`), pero **accept/reject necesitan que `ACCEPTED`/`REJECTED` existan** para reflejar el estado correcto.
- **Edición de tareas** (implementado): `PATCH /tasks/:id` edita `title`/`description`/`dueDate` (parcial). Habilita el drag-para-reprogramar del calendario. Ver la sección de `tasks`.
- **Escalada de privilegios vía registro (cerrado)**: `POST /users` ahora crea **siempre un `USER`** (el DTO no acepta `role`; mandar uno → `400`), así que nadie puede registrarse como `ADMIN`/`CREATOR`. La única vía de elevación es `PATCH /users/:id/role`, gateada por `canAssignRole`. El primer `CREATOR` se **bootstrapea desde el seed** (`prisma/seed.ts`, idempotente) con `BOOTSTRAP_CREATOR_NAME`/`BOOTSTRAP_CREATOR_PASSWORD` (defaults de dev `creator`/`change-me-please` — **cambiar el password en cualquier entorno real**). Cubierto por `user_managment.feature` (registro → USER), `role_assignment.feature` (elevación gateada) y e2e (`POST /users` sin rol → 201 USER, con rol → 400).

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
  auth/                    # JWT: login (access+refresh), POST /auth/refresh, JwtAuthGuard (global), @Public, @CurrentActor
  prisma/                  # PrismaModule (@Global), PrismaService
  users/
    domain/                # User, UserRole, UserAccessPolicy, Role + RoleRepository, puertos, errores
    application/           # CreateUser, ChangePassword, ChangeUserRole, ListUsers, ViewUser, UserView,
                           #   DeactivateUser, CreateRole, ListRoles
    infrastructure/        # persistence (in-memory, prisma) para User y Role, hashing (scrypt)
    dto/                   # CreateUserDto, ChangePasswordDto, ChangeUserRoleDto, CreateRoleDto
    tests/                 # user-management.steps.ts, user-directory.steps.ts, role-management.steps.ts, doubles/
    users.controller.ts | roles.controller.ts | users.module.ts
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
    domain/                # Company, CompanyAccessPolicy, CompanyContactLink, CompanyStatus + repo, errores
    application/           # CreateCompany, LinkContactToCompany, …, DeleteCompany,
                           #   CreateCompanyStatus, ListCompanyStatuses
    infrastructure/ dto/ tests/
    companies.controller.ts | company-statuses.controller.ts | companies.module.ts
  task-activities/         # TaskActivity, LogTaskActivity + ViewActivityLog
                           #   (POST/GET /tasks/:id/activities)
  task-assignments/        # TaskAssignment (historial), ViewAssignmentHistory + RespondToAssignment
                           #   (GET /tasks/:taskId/assignments, POST .../:id/accept|reject)
test/                      # app.e2e-spec.ts (e2e real-DB, JWT), setup-e2e.ts, jest-e2e.json
specs/                     # *.feature (Gherkin)
prisma/schema.prisma | prisma/seed.ts   # schema + seed idempotente de lookups
```
