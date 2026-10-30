# Instrucciones para agentes

MODDLE: gestión académica integrada con Moodle. Backend NestJS + TypeORM + PostgreSQL + Redis/BullMQ en `backend/`, frontend React 19 + Vite + TailwindCSS en `frontend/`. El proceso está en [docs/SCRUM.md](docs/SCRUM.md) y la convención en [CONTRIBUTING.md](CONTRIBUTING.md).

## Reglas

- Todo trabajo está ligado a un ticket de Jira del proyecto **SEB**. Si el usuario no lo da, pedilo antes de crear la rama.
- Nunca commitear ni pushear directo a `main`. Trabajar en una rama y abrir un PR.
- Rama: `<tipo>/SEB-<n>-descripcion` (p. ej. `feature/SEB-12-tests-auth`).
- Commit: `<tipo>(<modulo>): SEB-<n> <descripción en español>` (p. ej. `feat(auth): SEB-12 agrega tests de AuthService`).
- Título del PR: con la clave `SEB-<n>`; si falta, el check "Ticket de Jira" falla.
- Idioma de commits, PRs, tickets y docs: español.
- No commitear `.env`, tokens, `.claude/settings.local.json`, volcados `.sql` ni datos reales de estudiantes. Si un secreto llega a un commit, avisar para rotarlo.
- Backend: usar `Logger` de `@nestjs/common`, no `console.*`.

## Verificar antes de abrir un PR

```bash
cd backend && npm run lint && npm run build && npm test
cd frontend && npm run lint && npm run build
```
