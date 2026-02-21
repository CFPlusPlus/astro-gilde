# Modal-Pattern (Kurz)

Stand: 20.02.2026

Diese Mini-Doku erklärt die wichtigsten Entscheidungen für das Join-Modal und verwandte Overlays.

## 1) Warum Render-on-Demand

Das Join-Modal wird nicht statisch im Initial-DOM gehalten, sondern erst bei Bedarf geladen:

- Controller lazy via `import('./join-modal-controller')` in `src/scripts/app/join-modal.ts`
- Markup wird erst beim Öffnen erzeugt (`buildJoinModalMarkup`) und in `#join-modal-root` gemountet
- Beim Schließen wird der Modal-DOM wieder entfernt

Gründe:

- weniger Initial-JavaScript
- weniger Event-Listener im Idle-Zustand
- kein versteckter Dialog im Fokus-/A11y-Baum, wenn das Modal geschlossen ist

## 2) Fokus- und inert-Handling

Implementierung: `src/scripts/app/join-modal-controller.ts`

- Beim Öffnen wird das zuletzt fokussierte Element gespeichert (meist Trigger)
- Initial-Fokus geht auf `data-join-modal-initial-focus` (Fallback: erstes fokusierbares Element)
- `Tab`/`Shift+Tab` werden im Dialog getrappt
- `Escape` schließt den Dialog
- Beim Schließen wird Fokus sauber auf den Trigger zurückgegeben

Hintergrund wird während offenem Modal deaktiviert:

- primär über `HTMLElement.inert`
- Fallback ohne `inert`: `aria-hidden="true"` + `pointer-events-none`

Dadurch bleibt der Hintergrund nicht fokusierbar und nicht klickbar.

## 3) iOS Scroll-Lock Pattern

Implementierung: `src/scripts/app/scroll-lock.ts`

- Referenzzähler (`activeScrollLocks`) erlaubt verschachtelte Locks
- Auf Lock:
  - `html/body overflow = hidden`
  - Scrollbar-Ausgleich über `padding-right`
  - iOS zusätzlich: `body { position: fixed; top: -scrollY; left: 0; right: 0; width: 100% }`
- Auf letztem Release:
  - vorherige Inline-Styles werden exakt restauriert
  - Scrollposition wird via `window.scrollTo(0, savedScrollY)` wiederhergestellt

## 4) Persistenz-Keys

Aktuell verwendete Browser-Storage-Keys:

| Key                             | Bereich                                         | Zweck                                                |
| ------------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `theme`                         | `src/scripts/app/theme.ts`                      | Merkt Theme-Modus (`system`, `light`, `dark`)        |
| `mg:live-counter:v2:<key>`      | `src/scripts/app/live-counters.ts`              | Persistenter Cache für Home-Live-Counter             |
| `mg:live-resource:v1:<key>`     | `src/lib/live/cache.ts`                         | Standard-Prefix des generischen Live-Resource-Caches |
| `mg_stats_welcome_dismissed_at` | `src/features/stats/welcome.ts`                 | Dismiss-Zeitstempel für Stats-Welcome                |
| `mg_stats_welcome_closed`       | `src/features/stats/welcome.ts`                 | Legacy-Key (wird migriert/entfernt)                  |
| `mg:skin-viewer:cape:<uuid>`    | `src/features/player-stats/skin-viewer-cape.ts` | Cape-Cache pro Spieler                               |
