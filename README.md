# MODDLE — Gestión académica integrada con Moodle

Sistema de gestión académica para SEBTI que extiende Moodle: períodos, calificaciones, reinscripción por subprograma, proyección académica, reportería, récords oficiales verificables y pagos.

[![CI](https://github.com/santicodevv/MODDLE/actions/workflows/ci.yml/badge.svg)](https://github.com/santicodevv/MODDLE/actions/workflows/ci.yml)
[![Secretos](https://github.com/santicodevv/MODDLE/actions/workflows/secretos.yml/badge.svg)](https://github.com/santicodevv/MODDLE/actions/workflows/secretos.yml)

| | |
|---|---|
| Producción (API) | <https://moddle-production-4be1.up.railway.app/api> — Railway |
| Frontend | Vercel (deploy automático desde `main`) |
| Base de datos | Neon (PostgreSQL) |
| Tablero | [Jira SEB](https://welin1924-1793141597420.atlassian.net/jira/software/projects/SEB/boards/5) |

## Funcionalidades

- **Autenticación**: email + contraseña con JWT, o **Microsoft SSO** (Azure AD) restringido al dominio de la institución. Roles `STUDENT`, `TEACHER`, `ADMIN`; logout con lista negra de tokens en Redis.
- **Sincronización con Moodle**: espejo local de categorías, cursos, usuarios, matrículas y notas, y patrón *outbox* con colas Bull para escribir de vuelta. Sync automático cada hora y reconciliación diaria a las 2:00; webhook entrante de Moodle.
- **Gestión académica**: períodos (planificado → abierto → cerrado), cursos y profesores, carga y edición de notas en sesiones controladas por el admin.
- **Reinscripción** por subprograma: el estudiante elige materias del período y el admin aprueba, rechaza o aplica en Moodle.
- **Proyección académica**: programas, subprogramas y planes de estudio; demanda por asignatura y por nivel; matriz de notas estudiantes × cursos.
- **Reportería** en Excel y PDF por estudiante, curso y período.
- **Récords oficiales (transcripts)** en PDF con QR y hash SHA-256, verificables públicamente y revocables.
- **Pagos**: facturas del estudiante desde la API de pagos de Knorooms (GoHighLevel).
- **Auditoría** de cambios y **health checks** (base de datos, memoria, liveness/readiness).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19, TypeScript, Vite 7, TailwindCSS 4, TanStack Query 5 |
| Backend | NestJS 11, TypeORM 0.3, Passport (JWT + Microsoft) |
| Datos | PostgreSQL (Neon en producción), Redis + Bull |
| Documentos | ExcelJS, PDFKit, qrcode |
| API docs | Swagger/OpenAPI en `/api/docs` |
| CI | GitHub Actions: lint, build y tests, ticket de Jira, escaneo de secretos (gitleaks) |

## Requisitos

- Node.js 20 (el que usa CI)
- Docker y Docker Compose (Postgres y Redis locales)
- Acceso a una instancia de Moodle con token de *web services* para sincronizar datos

## Puesta en marcha local

```bash
git clone git@github.com:santicodevv/MODDLE.git   # o tu fork, si no sos el owner (ver CONTRIBUTING.md)
cd MODDLE
git config core.hooksPath .githooks        # hooks: bloquean push a main y commits con secretos
```

**1. Postgres y Redis.** `docker-compose.yml` usa `moddle_db` / `moddle_user` / `moddle_pass` por defecto. Si el puerto 5432 o 6379 ya está ocupado, cambialo con `DB_PORT` o `REDIS_PORT`:

```bash
docker compose up -d postgres redis
```

**2. Backend** (puerto 3000):

```bash
cd backend
cp .env.example .env
```

Editá `backend/.env` para desarrollo local:

- `NODE_ENV=development`: activa `synchronize` de TypeORM, que crea las tablas solo. En `production` se aplican las migraciones al iniciar.
- Comentá `DATABASE_URL` y descomentá las variables `DB_*`. Si `DATABASE_URL` está definida, se usa siempre con SSL.
- `MOODLE_URL` y `MOODLE_TOKEN` de tu Moodle de pruebas.

```bash
npm install
npm run seed:roles        # crea los roles STUDENT, TEACHER y ADMIN
npm run sync:moodle       # (opcional) trae categorías, cursos y usuarios desde Moodle
npm run start:dev
```

**3. Frontend** (puerto 5173), en otra terminal:

```bash
cd frontend
echo "VITE_API_URL=http://localhost:3000/api" > .env.local
npm install
npm run dev
```

| Servicio | URL local |
|---|---|
| Frontend | <http://localhost:5173> |
| API | <http://localhost:3000/api> |
| Swagger | <http://localhost:3000/api/docs> |
| Health | <http://localhost:3000/api/health> |
| pgAdmin (opcional: `docker compose up -d pgadmin`) | <http://localhost:5050> |

## Variables de entorno

Plantilla completa en [`backend/.env.example`](backend/.env.example). **Nunca** se commitea un `.env` real: lo bloquean `.gitignore`, el hook `pre-commit` y el check *Escaneo de secretos*. En producción los valores viven en Railway (backend) y Vercel (frontend).

### Backend

| Variable | Uso |
|---|---|
| `NODE_ENV` | `development` (sincroniza el esquema) o `production` (aplica migraciones) |
| `PORT` | Puerto HTTP (3000) |
| `DATABASE_URL` | Conexión completa con SSL (Neon). Tiene prioridad sobre `DB_*` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión local sin `DATABASE_URL` |
| `REDIS_HOST`, `REDIS_PORT` / `REDIS_URL` | Colas Bull y lista negra de tokens |
| `JWT_SECRET`, `JWT_EXPIRATION` | Firma y duración de los tokens |
| `CORS_ORIGINS` | Orígenes permitidos, separados por coma |
| `FRONTEND_URL` | A dónde vuelve el login con Microsoft |
| `APP_BASE_URL` | URL pública de la API, usada en el QR de los transcripts |
| `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALLBACK_URL` | SSO con Azure AD |
| `ALLOWED_EMAIL_DOMAIN` | Dominio de correo permitido en el SSO |
| `MOODLE_URL`, `MOODLE_TOKEN`, `MOODLE_WEBHOOK_SECRET` | Integración con Moodle |
| `PAYMENTS_API_URL`, `PAYMENTS_API_TOKEN`, `PAYMENTS_LOCATION_ID` | API de pagos |

### Frontend

| Variable | Uso |
|---|---|
| `VITE_API_URL` | URL base de la API (`http://localhost:3000/api` en local) |
| `VITE_MOODLE_URL` | Enlaces al campus Moodle (por defecto `https://campus.sebti.edu.do`) |

## Estructura

```text
MODDLE/
├── backend/                  NestJS
│   ├── src/
│   │   ├── common/           decorators, guards (JWT, roles), interceptors
│   │   ├── config/           base de datos, Redis, escala de notas
│   │   ├── migrations/       migraciones de TypeORM
│   │   └── modules/
│   │       ├── auth/                 login, JWT, Microsoft SSO, lista negra
│   │       ├── users/                usuarios, profesores, roles
│   │       ├── academic/             períodos, cursos, notas, reinscripción
│   │       ├── academic-projection/  programas, planes de estudio, demanda, matriz
│   │       ├── grades/               sesiones de edición de notas sobre el espejo de Moodle
│   │       ├── moodle-integration/   cliente de Moodle y entidades espejo
│   │       ├── sync/                 outbox, colas, scheduler, auditoría, comandos CLI
│   │       ├── webhooks/             webhook entrante de Moodle
│   │       ├── reports/              Excel y PDF
│   │       ├── transcripts/          récords oficiales con QR
│   │       ├── payments/             facturas
│   │       └── health/               health checks
│   ├── scripts/              scripts operativos puntuales
│   └── test/                 e2e
├── frontend/                 React + Vite
│   └── src/
│       ├── app/              providers (AuthContext) y router (rutas, guards por rol)
│       ├── modules/
│       │   ├── admin/        dashboard, usuarios, cursos, períodos, notas, sync, auditoría, pagos, transcripts
│       │   ├── teacher/      cursos y carga de notas
│       │   ├── student/      cursos, notas, reinscripción, pagos, transcripts
│       │   └── auth/         login, registro, SSO, expiración de sesión
│       └── shared/           API (axios), componentes UI, layout, utilidades
├── docs/SCRUM.md             proceso de trabajo
├── .github/                  workflows de CI, plantilla de PR, ruleset de main
├── .githooks/                pre-commit (secretos) y pre-push (main)
└── docker-compose.yml        Postgres, Redis y pgAdmin para desarrollo
```

## API

Todas las rutas cuelgan de `/api` y, salvo las públicas, requieren `Authorization: Bearer <token>`. La referencia completa con esquemas está en **Swagger** (`/api/docs`).

| Prefijo | Contenido |
|---|---|
| `/auth` | `register`, `login`, `logout`, `me` (GET/PATCH), `microsoft` y su `callback` |
| `/users` | Usuarios, profesores y asignación de roles |
| `/periods` | Períodos académicos, apertura y cierre, ventana de reinscripción |
| `/courses` | Cursos del período, profesores asignados, matriculados |
| `/grades`, `/student-grades` | Carga, edición y consulta de notas |
| `/re-enrolments` | Solicitudes de reinscripción y su aprobación |
| `/academic-projection` | Programas, subprogramas, planes de estudio, demanda y matriz de notas |
| `/reports` | Reportes por estudiante, curso y período (`?format=excel` o `?format=pdf`) |
| `/transcripts` | Generación, descarga y revocación; `verify/:hash` es **público** |
| `/payments` | Facturas propias y gestión de pagos |
| `/sync`, `/integrations/moodle`, `/audit` | Sincronización manual, estado, reconciliación y auditoría |
| `/integrations/moodle/webhook` | Webhook de Moodle (**público**, valida `MOODLE_WEBHOOK_SECRET`) |
| `/health` | `/`, `db`, `memory`, `live`, `ready` (públicos) |

## Comandos

### Backend (`backend/`)

```bash
npm run start:dev            # desarrollo con watch
npm run build                # compila a dist/
npm run start:prod           # ejecuta dist/
npm run lint                 # ESLint (con --fix)
npm test                     # tests unitarios (Jest)
npm run test:cov             # cobertura
npm run test:e2e             # e2e (necesita Postgres y Redis)
npm run seed:roles           # crea los roles base
npm run sync:moodle          # sincronización completa desde Moodle
npm run migration:generate -- src/migrations/<Nombre>   # nueva migración
npm run migration:run        # aplica migraciones
npm run migration:revert     # revierte la última
```

### Frontend (`frontend/`)

```bash
npm run dev                  # Vite en :5173
npm run build                # type-check + build
npm run preview              # sirve el build
npm run lint                 # ESLint
```

## Arquitectura

```text
 React (Vercel) ──HTTP/JSON──► NestJS API (Railway) ──► PostgreSQL (Neon)
                                   │      ▲
                         Bull/Redis│      │ webhook
                                   ▼      │
                                 Moodle (web services)
```

Escritura hacia Moodle con patrón *outbox*: el cambio se guarda en la base local y se registra un evento en `outbox_events`; un worker de Bull lo envía a Moodle con reintentos, y el espejo (`moodle_*`) se actualiza por sync o por webhook. Hoy la nota y su evento se guardan en dos operaciones separadas, no en una transacción.

## Flujo de trabajo

El equipo trabaja con **Scrum** (sprints de 2 semanas) en el tablero [SEB de Jira](https://welin1924-1793141597420.atlassian.net/jira/software/projects/SEB/boards/5). Detalle en [docs/SCRUM.md](docs/SCRUM.md) y [CONTRIBUTING.md](CONTRIBUTING.md).

1. Tomá un ticket `SEB-<n>` y pasalo a *En curso*.
2. Rama con la clave: `feature/SEB-12-descripcion` (o `fix/`, `test/`, `docs/`, `chore/`).
3. Commits con la clave: `feat(auth): SEB-12 descripción`.
4. `gh pr create`: el ticket pasa solo a *En revisión*.
5. El owner del repo (`santicodevv`) revisa y mergea; el ticket pasa solo a *Listo*.

`main` está protegida: no se puede pushear directo y todo entra por PR con los checks *Frontend*, *Backend*, *Ticket de Jira* y *Escaneo de secretos* en verde. Solo el owner tiene permiso de escritura; el resto del equipo trabaja desde un *fork*.

## Seguridad

- Contraseñas con bcrypt; JWT con expiración y revocación en logout.
- Control de acceso por rol con guards globales; las rutas públicas se marcan con `@Public()`.
- Validación de entrada con DTOs (`class-validator`) y rate limiting global (`@nestjs/throttler`).
- Récords oficiales con hash SHA-256 verificable y revocación.
- Secretos fuera del repo, con tres barreras: hook `pre-commit`, gitleaks en CI y push protection de GitHub. Si un secreto llega a un commit se **rota**; borrar el commit no alcanza.

¿Encontraste una vulnerabilidad? No abras un issue público: escribile al responsable del repositorio.

## Licencia

Propietario. Todos los derechos reservados.
