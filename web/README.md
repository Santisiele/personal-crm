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
  pages/          # Login, Dashboard, Calendar, Tasks, Users, Profile
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

## Calendario

- Vistas **mes** y **semana** (FullCalendar, locale ES, semana desde el lunes).
- **Click en un día** → crear tarea con esa fecha. **Click en un evento** → editar. **Drag de un evento** → reprogramar (`PATCH /tasks/:id` con el nuevo `dueDate`; si falla, revierte).
- Cada tarea se pinta con un **color determinístico por persona** (`hooks/userColors.ts`), estable entre sesiones. Los privilegiados tienen un toggle **dueño/asignado** y una **leyenda** nombre↔color (los nombres salen de `GET /users`).

## i18n

La API es en inglés (enums de estado, roles). El front traduce esas **claves técnicas** a español solo para mostrar (`labels.ts`); los datos libres se muestran verbatim. Mismo criterio que el backend.
