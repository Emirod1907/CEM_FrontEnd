# Rediseño Dream Events — marca unificada (violeta → magenta del AdminPanel)

## Qué cambió
- **global.css**: paleta de marca reconciliada a la del Panel de Administración
  (violeta #6b23d8 / #5f16c9, magenta #d827b7). Fondo degradado en la misma familia.
  Todos los tokens `--de-*` en un solo lugar. Importa `de-ui.css`.
- **de-ui.css** (NUEVO): primitivos reutilizables con el lenguaje del AdminPanel —
  `de-panel`, `de-eyebrow`, `de-section-heading`, `de-badge`, `de-btn`,
  `de-input`/`de-field`, `de-table`, `de-check` y la **ventana interna** `de-window`.
  Son clases opt-in: no alteran nada existente hasta que un componente las adopta.
- **Migración de color en todo el sitio**: se reemplazó la marca vieja
  (#770981 / #1882da y sus rgba) por la nueva en 40 archivos (541 reemplazos).
  Solo colores: no se tocó lógica, clases, estructura, servicios, API ni datos.
- **Modals/Modal/Modal.jsx**: migrado a la ventana interna `de-window` (ejemplo del patrón).

## Lo que sigue (migración estructural, por tandas)
NavBar → resto de modales a `de-window` → pantallas a `de-panel`/`de-table`
→ formularios a `de-field`/`de-btn` → flujo de evento y pagos.

## Backend
Intacto. Todos los cambios son de presentación (CSS + marcado/inline en JSX).
