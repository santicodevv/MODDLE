# Proceso Scrum — MODDLE

Cómo trabaja el equipo de MODDLE (gestión académica integrada con Moodle) con Scrum, Jira y GitHub.

| | |
|---|---|
| Jira | [Proyecto SEB (Sebti)](https://welin1924-1793141597420.atlassian.net/jira/software/projects/SEB/boards/5) — tickets `SEB-1`, `SEB-2`… |
| Repositorio | `santicodevv/MODDLE` |
| Sprint | 2 semanas, de lunes a viernes de la semana siguiente |
| Equipo | 2 personas |

## Roles

Con un equipo de dos personas los roles se combinan, pero las responsabilidades se mantienen separadas.

| Rol | Responsabilidad |
|---|---|
| **Product Owner** | Ordena el backlog, escribe criterios de aceptación, acepta o rechaza en la Review. |
| **Scrum Master** | Facilita las ceremonias, cuida el tablero y quita bloqueos. Rota cada sprint. |
| **Developers** (los dos) | Estiman, se comprometen con el objetivo del sprint, implementan y revisan los PRs del otro. |

Cada PR lo revisa la persona que **no** lo escribió.

## Ceremonias

| Ceremonia | Cuándo | Duración | Resultado |
|---|---|---|---|
| Sprint Planning | Lunes del día 1 | 1 h | Objetivo del sprint y tickets comprometidos (≈ 15–20 pts) |
| Daily | Todos los días | 15 min | ¿Qué hice? ¿Qué haré? ¿Qué me bloquea? Tablero actualizado |
| Refinamiento | Miércoles de la semana 1 | 45 min | Tickets del próximo sprint cumplen la Definition of Ready |
| Sprint Review | Viernes del día 10 | 30 min | Demo de lo terminado; el PO acepta o devuelve al backlog |
| Retrospectiva | Viernes del día 10, tras la Review | 30 min | 1–2 acciones de mejora, como tickets con label `proceso` |

## Tipos de ticket y ramas

| Tipo en Jira | Uso | Prefijo de rama | Tipo de commit |
|---|---|---|---|
| Historia | Funcionalidad visible para un usuario | `feature/` | `feat` |
| Tarea | Trabajo técnico (tests, refactor, CI) | `chore/`, `test/`, `refactor/`, `docs/` | `chore`, `test`, `refactor`, `docs` |
| Error | Algo que funciona mal | `fix/` | `fix` |
| Subtask | Parte de una historia o tarea grande | rama del padre | — |
| Epic | Agrupa trabajo de un área (ver abajo) | — | — |

Convención:

```text
rama:    feature/SEB-12-tests-auth
commit:  feat(auth): SEB-12 agrega tests de AuthService
PR:      feat(auth): SEB-12 tests de AuthService
```

## Épicas

| Épica | Alcance |
|---|---|
| SEB-2 Infraestructura y DevOps | CI/CD, ESLint, e2e, Docker, despliegue, seguridad del repo, proceso |
| SEB-3 Autenticación y usuarios | `auth`, `users`, `common/guards`; login JWT, Microsoft SSO, roles |
| SEB-4 Gestión académica y calificaciones | `academic`, `academic-projection`, `grades`; períodos, notas, reinscripción |
| SEB-5 Integración y sincronización con Moodle | `moodle-integration`, `sync`, `webhooks`; mirror, outbox, auditoría |
| SEB-6 Reportes, transcripts y pagos | `reports`, `transcripts`, `payments` |
| SEB-7 Portal web (frontend) | `frontend/`: layout, componentes compartidos, tests del frontend |

## Flujo del tablero

```text
Por hacer ──► En curso ──► En revisión ──► Listo
   (tomo el ticket)   (abro el PR)    (se mergea el PR)
```

| Columna | Entra cuando… | Quién lo mueve |
|---|---|---|
| Por hacer | Está en el sprint y cumple DoR | Planning |
| En curso | Alguien se lo asigna y crea la rama | El developer, a mano |
| En revisión | Se abre (o se marca ready) el PR | **Automático** (workflow) |
| Listo | El PR se mergea a `main` | **Automático** (workflow) + comentario con link |

Límite de trabajo en curso: 1 ticket "En curso" por persona.

## Story points

Fibonacci: **1, 2, 3, 5, 8, 13**. Se estima complejidad e incertidumbre, no horas.

| Pts | Referencia en este repo |
|---|---|
| 1 | Cambio de configuración o de una línea (agregar columna al tablero) |
| 2 | Cambio chico en un archivo con su test (reemplazar `console.*` por `Logger`) |
| 3 | Tests de un servicio mediano o un workflow nuevo |
| 5 | Tests de un servicio grande con mocks de varias dependencias (AuthService) |
| 8 | Refactor que toca backend y frontend |
| 13 | Demasiado grande: hay que partirlo antes de entrar al sprint |

Capacidad inicial: **15–20 pts por sprint**. Se ajusta con la velocidad real de los sprints anteriores.

## Definition of Ready

Un ticket puede entrar a un sprint cuando:

- [ ] Tiene título claro y descripción con el *porqué*.
- [ ] Tiene criterios de aceptación verificables, como checklist.
- [ ] Está estimado (≤ 8 pts) y tiene prioridad.
- [ ] Tiene épica padre y labels (`testing`, `deuda-tecnica`, `devops`, `proceso`, `seguridad`…).
- [ ] No tiene dependencias bloqueantes abiertas.

## Definition of Done

Un ticket está terminado cuando:

- [ ] Cumple todos los criterios de aceptación.
- [ ] El PR tiene la clave `SEB-<n>` y pasa todos los checks: *Frontend*, *Backend*, *Ticket de Jira*.
- [ ] Lo aprobó la otra persona del equipo y no quedan conversaciones abiertas.
- [ ] Tiene tests nuevos o actualizados si cambió lógica.
- [ ] No agrega `console.log`, secretos ni `.env` (lo revisan el hook `pre-commit` y el check *Escaneo de secretos*).
- [ ] Está mergeado a `main` y el ticket quedó en *Listo* con el link del PR.

## Integración Jira ↔ GitHub

No usamos la app "GitHub for Jira": suele fallar al conectar y no hace falta. La reemplazan tres workflows:

| Workflow | Check | Qué hace |
|---|---|---|
| `.github/workflows/jira.yml` | **Ticket de Jira** | Falla si ni la rama ni el título del PR tienen `SEB-<n>` |
| `.github/workflows/jira-transiciones.yml` | Mover tickets en Jira | PR abierto/reabierto/ready → *En revisión* (o *En curso* si esa columna no existe). PR mergeado → *Listo* + comentario con el link |
| `.github/workflows/main-solo-por-pr.yml` | Commit vino de un PR | En cada push a `main`, falla si el commit no viene de un PR mergeado |
| `.github/workflows/secretos.yml` | Escaneo de secretos | Corre gitleaks sobre los commits nuevos del PR (reglas en `.gitleaks.toml`) |

Puede haber varias claves en el título (`SEB-1 SEB-8`) y se mueven todas.

### Secretos

| Secreto | Valor |
|---|---|
| `JIRA_USER_EMAIL` | Email de la cuenta Atlassian dueña del token |
| `JIRA_API_TOKEN` | API token creado en <https://id.atlassian.com/manage-profile/security/api-tokens> → **Create API token** |

Si faltan, el workflow avisa con un warning y termina en verde. Primero valida las credenciales con `/rest/api/3/myself` (con credenciales malas Jira responde 404 en los tickets, lo que confunde) y prueba la URL del sitio y luego el gateway `api.atlassian.com/ex/jira/<cloudId>`, que es el único que acepta tokens con alcances.

Para probar un token antes de guardarlo (fish):

```fish
read -s -P "Token: " JT
curl -s -o /dev/null -w '%{http_code}\n' -u "tu-email@ejemplo.com:$JT" https://welin1924-1793141597420.atlassian.net/rest/api/3/myself
```

Tiene que imprimir `200`. Después:

```fish
printf '%s' $JT | gh secret set JIRA_API_TOKEN --repo santicodevv/MODDLE
gh secret set JIRA_USER_EMAIL --repo santicodevv/MODDLE --body "tu-email@ejemplo.com"
gh secret list --repo santicodevv/MODDLE
```

Nunca pegues el token en un chat, issue o PR. Si pasa, revocalo y creá otro.

### Re-disparar las transiciones

Cerrar y reabrir el PR ejecuta la versión del workflow que está en la rama. "Re-run" en Actions repite la ejecución anterior con el workflow de *esa* ejecución.

## Protección de `main`

El repo es público y `main` está protegida por el ruleset **"Proteger main"**, definido en `.github/rulesets/main.json`:

- PR obligatorio con **1 aprobación**; las aprobaciones se descartan si llegan commits nuevos.
- Conversaciones resueltas antes de mergear.
- Checks requeridos con la rama al día: *Frontend*, *Backend*, *Ticket de Jira* y *Escaneo de secretos* (GitHub Actions, `integration_id` 15368).
- Sin force-push ni borrado de `main`.
- **Sin bypass**: ni los admins pueden saltarlo. Desde el 30-10-2026, cuando se quitó, nadie puede aprobar su propio PR, así que el equipo necesita al menos dos personas con permiso *Write*.

Además, como respaldo:

1. **Hook local** `.githooks/pre-push`: rechaza `git push` a `main` antes de que llegue a GitHub. Cada persona lo activa una vez por clon:

   ```bash
   git config core.hooksPath .githooks
   ```

2. **Workflow** *Main solo por PR*: deja en rojo cualquier commit que llegue a `main` sin un PR.

Si se edita el ruleset en GitHub, actualizá también `.github/rulesets/main.json`. Para recrearlo desde el archivo:

```bash
gh api repos/santicodevv/MODDLE/rulesets --method POST --input .github/rulesets/main.json
```

En una urgencia sin segundo revisor disponible, un admin puede agregar un bypass temporal: Settings → Rules → Rulesets → Proteger main → Bypass list → *Repository admin* → *For pull requests only*. Hay que quitarlo apenas se use.

## Secretos y datos sensibles

Lo que **nunca** se commitea: `.env` (salvo `.env.example` con placeholders), `.claude/settings.local.json`, llaves (`*.pem`, `*.key`), volcados (`*.dump`, `*.sqlite`, `*.sql` en la raíz) ni datos reales de estudiantes. Todo eso está en `.gitignore`.

Hay tres barreras:

1. **`.githooks/pre-commit`** (local): rechaza esos archivos y patrones como `npg_…`, URLs de Postgres/Redis con contraseña, tokens de GitHub/Atlassian/AWS, llaves privadas y JWT.
2. **Check *Escaneo de secretos*** (CI): gitleaks con las reglas de `.gitleaks.toml` sobre cada PR y cada push a `main`.
3. **GitHub secret scanning + push protection**: GitHub bloquea el push si reconoce un token de un proveedor conocido.

Si un secreto llega a un commit, aunque sea en una rama que nadie mergeó, **se rota**: borrar el commit no alcanza porque GitHub conserva las refs de los PRs. No se agrega a `.gitleaksignore` salvo que ya esté rotado, y con un comentario que diga cuándo.

Credenciales de producción: viven solo en Railway (backend), Vercel (frontend) y los secretos de GitHub Actions.

## Flujo diario

```bash
# 1. Tomar un ticket de "Por hacer", asignármelo y pasarlo a "En curso" en Jira
# 2. Rama con la clave
git switch main && git pull
git switch -c feature/SEB-12-tests-auth
# 3. Commits con la clave
git commit -m "test(auth): SEB-12 agrega tests de AuthService"
# 4. PR (pasa solo a "En revisión")
git push -u origin HEAD
gh pr create --base main --title "test(auth): SEB-12 tests de AuthService" --fill
# 5. La otra persona revisa y aprueba; al mergear pasa solo a "Listo"
```
