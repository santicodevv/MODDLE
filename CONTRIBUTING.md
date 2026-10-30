# Cómo contribuir

El proceso completo (roles, ceremonias, Definition of Done) está en [docs/SCRUM.md](docs/SCRUM.md). Esto es lo mínimo para mandar un cambio.

## Antes de empezar

```bash
git config core.hooksPath .githooks   # bloquea push directo a main y commits con secretos
```

Todo cambio necesita un ticket en Jira, en el proyecto [SEB](https://welin1924-1793141597420.atlassian.net/jira/software/projects/SEB/boards/5). Si no existe, crealo con criterios de aceptación.

## Convención

| Qué | Formato | Ejemplo |
|---|---|---|
| Rama | `<tipo>/SEB-<n>-descripcion-corta` | `feature/SEB-12-tests-auth` |
| Commit | [Conventional Commits](https://www.conventionalcommits.org/es/) con la clave | `feat(auth): SEB-12 agrega tests de AuthService` |
| Título del PR | igual que el commit principal | `test(auth): SEB-12 tests de AuthService` |

Tipos: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `ci`. El *scope* es el módulo: `auth`, `academic`, `sync`, `reports`, `frontend`…

El check **Ticket de Jira** falla si la rama y el título del PR no tienen `SEB-<n>`.

## Pull request

Solo el owner del repo (`santicodevv`) tiene permiso de escritura y es quien mergea. Si no sos el owner, trabajá desde tu *fork*:

```bash
gh repo fork santicodevv/MODDLE --clone   # una sola vez; deja "origin" = tu fork y "upstream" = este repo
git switch -c feature/SEB-12-descripcion upstream/main
```

1. `git push -u origin HEAD` y `gh pr create --repo santicodevv/MODDLE --base main` (el owner solo necesita `gh pr create --base main`).
2. Completá la plantilla, incluido el campo del ticket.
3. Esperá los checks en verde: *Frontend (lint + type-check)*, *Backend (lint + type-check + test)*, *Ticket de Jira* y *Escaneo de secretos*.
4. El owner revisa y mergea. Si el PR es del owner, conviene que la otra persona lo mire igual.
5. Al mergear, el ticket pasa solo a *Listo* en Jira.

## Comandos útiles

```bash
cd backend && npm run lint && npm run build && npm test
cd frontend && npm run lint && npm run build
```
