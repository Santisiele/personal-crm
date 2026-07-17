# web — Frontend del Personal CRM

SPA en **React 18 + TypeScript** (Vite) que consume la API del CRM. UI con **Mantine**, calendario con **FullCalendar**, estado del servidor con **TanStack Query**. Forma parte del monolito: en producción el backend Nest la sirve como estático bajo **`/app`**.

## Stack

- **Vite 6** + **React 18** + **TypeScript** (`base: '/app/'`, alias `@ → src/`).
- **Mantine 7** (`@mantine/core`, `dates`, `form`, `notifications`, `modals`, `hooks`) + `@tabler/icons-react`.
- **FullCalendar 6** (`daygrid`, `timegrid`, `interaction`) para el calendario con drag & drop.
- **TanStack Query 5** para fetching/caché e invalidación.
- **Axios** con interceptores de auth. **react-router-dom** con **HashRouter**.

## Puesta en marcha

```bash
pnpm install
cp .env.example .env      # VITE_API_URL=http://localhost:3000 (origen de la API en dev)
pnpm dev                  # http://localhost:5173/app/
pnpm build                # tsc --noEmit && vite build → web/dist/
pnpm preview              # sirve el build localmente
```

En **dev** corren dos procesos: el backend (`pnpm start:dev` en la raíz) y este dev server; la SPA pega a la API vía `VITE_API_URL` con CORS habilitado en el backend.

Para el **monolito en prod**: `pnpm build` acá y `pnpm start:prod` en la raíz. Nest sirve la SPA en `http://localhost:3000/app/` y la API en la raíz (mismo origen, sin CORS). Como la SPA usa **hash routing**, todas las rutas de cliente viven en `/app/#/...` y el server solo sirve `index.html`; no hace falta fallback de deep-links.

## Estructura

```
web/src/
  api/            # capa HTTP: client (axios + refresh), auth, tasks, users, tokens, types
  auth/           # AuthContext (sesión + usuario actual) y guards de ruta (RequireAuth, RequirePrivileged)
  hooks/          # useTasks, useUsers (TanStack Query) y userColors (color determinístico por usuario)
  components/     # AppLayout (shell + nav por rol), TaskModal (crear/editar), UserColorLegend
  pages/          # Login, Dashboard, Calendar, Tasks, Kanban, Inbox, Contacts,
                  #   Companies, CompanyDetail, CompanyStatuses, Users, Profile
  labels.ts       # traducción ES de las claves técnicas (estados, roles) — solo para mostrar
  theme.ts        # tema Mantine
  main.tsx        # providers (Mantine, Modals, Notifications, Query, Router, Auth)
```

## Autenticación

- El login (`POST /auth/login`) devuelve un par **access/refresh** que se guarda en `localStorage` (`api/tokens.ts`).
- Un interceptor de request adjunta el access token; ante un **401**, un interceptor de response canjea el refresh token en `POST /auth/refresh` (**single-flight**: un solo refresh para un pico de 401 simultáneos) y reintenta el request. Si el refresh falla, se limpia la sesión y la app vuelve al login.
- `AuthContext` hidrata el usuario actual con `GET /auth/me` (`{ id, name, role }`) y expone `privileged` (ADMIN/CREATOR). Los guards de ruta gatean por sesión y por rol.

## Roles y permisos (espejo de la API)

- **USER**: ve/gestiona sus tareas (dueño o asignado); su calendario muestra solo las suyas.
- **ADMIN / CREATOR** (privilegiados): ven **todas** las tareas del equipo en el calendario, coloreadas por persona, y acceden a la sección **Usuarios**.
- **Asignación de roles**: la UI solo la ofrece al **CREATOR** (la API confina al ADMIN a usuarios comunes y le impide otorgar por encima de `USER`, así que hoy no puede cambiar roles). La UI nunca ofrece una acción que la API rechazaría con 403.
- **Registro**: `POST /users` crea siempre un `USER` (la API rechaza un `role` en el alta), así que el front no manda rol al registrarse. Crear un usuario con rol desde la pantalla **Usuarios** (solo CREATOR) es un alta como `USER` seguida de un `PATCH /users/:id/role`.

## Calendario

- Vistas **mes** y **semana** (FullCalendar, locale ES, semana desde el lunes).
- **Click en un día** → crear tarea con esa fecha. **Click en un evento** → editar. **Drag de un evento** → reprogramar (`PATCH /tasks/:id` con el nuevo `dueDate`; si falla, revierte).
- Cada tarea se pinta con un **color determinístico por persona** (`hooks/userColors.ts`), estable entre sesiones. Los privilegiados tienen un toggle **dueño/asignado** y una **leyenda** nombre↔color (los nombres salen de `GET /users`).
- **Reasignar al editar** (calendario o lista): el modal de tarea muestra un selector **"Reasignar a"** cuando el actor puede reasignar (el dueño, o un privilegiado que supera en rol al asignado actual — espeja `canReassign` de la API). Las opciones salen de `GET /users/assignable`, así que hasta un USER puede reasignar su propia tarea; al guardar, si el asignado cambió se dispara `PATCH /tasks/:id/assignee`.

## Tablero, actividad y bandeja

- **Tablero** (`/board`): las tareas agrupadas en columnas Pendiente / En progreso / Completada, coloreadas por responsable. **Drag & drop nativo** (HTML5) entre columnas cambia el estado (`PATCH /tasks/:id/status`).
- **Actividad de tarea**: un drawer por tarea (solo dueño o privilegiado, que es lo que autoriza la API) con el log de actividad (con su detalle y autor), un formulario para registrar llamada/reunión/email/nota (`GET`/`POST /tasks/:id/activities`), y el **historial de asignaciones** de la tarea (quién, cuándo, y el estado aceptada/rechazada, vía `GET /tasks/:id/assignments`).
- **Bandeja** (`/inbox`): las asignaciones pendientes del actor con aceptar/rechazar (`GET /me/assignments/pending` + los endpoints accept/reject). Los títulos se resuelven del listado de tareas y hay un badge de conteo en la nav.
- **Actividad del equipo** (`/activity`, **solo ADMIN/CREATOR**): el feed global de toda la actividad (`GET /activities`), cada entrada con su tarea, autor, fecha y detalle.

## Contactos y empresas

- **Contactos** (`/contacts`): lista, alta, edición (`contactName`/`email`/`birth`) y baja lógica. Sin autorización por rol, igual que la API (cualquier autenticado gestiona contactos).
- **Empresas** (`/companies`): lista visible a todos; alta/edición/estado/baja solo para privilegiados. El **detalle** (`/companies/:id`) muestra los campos, el estado y los **contactos vinculados**, y permite vincular un contacto (elegir de los existentes + rol + teléfono), cambiar estado y dar de baja.
- **Estado de empresa**: el selector para asignar un estado usa el catálogo `GET /company-statuses` cuando el actor es **CREATOR**; para un **ADMIN** (que no puede leer ese catálogo CREATOR-only pero sí asignar estados) cae a los estados ya en uso en las empresas — un subconjunto seguro que no da 404 al asignar.
- **Estados de empresa** (`/company-statuses`, **solo CREATOR**): ABM de las descripciones de estado (dato libre en español).

## i18n

La API es en inglés (enums de estado, roles). El front traduce esas **claves técnicas** a español solo para mostrar (`labels.ts`); los datos libres (nombres, descripciones de estado de empresa) se muestran verbatim. Mismo criterio que el backend.
