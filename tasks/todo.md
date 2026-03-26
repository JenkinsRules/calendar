# Calendar App — Build Checklist

## Tasks

- [x] **1. Scaffold** — Create index.html shell, style.css, app.js stubs, this file
  - Acceptance: All four files exist; index.html opens in browser without errors

- [x] **2. CSS layout** — Design tokens, reset, header, 7-column calendar grid
  - Acceptance: Month grid renders with correct 7 columns; header shows month label and nav buttons

- [x] **3. CSS modal** — Overlay, form fields, buttons, error/hidden states
  - Acceptance: Modal can be toggled visible/hidden with correct centering and overlay

- [x] **4. JS foundation** — State object, localStorage helpers, init, day-header render
  - Acceptance: Day headers (Sun–Sat) render on page load; loadEvents/saveEvents round-trip correctly

- [x] **5. JS rendering** — renderHeader, renderGrid, month navigation
  - Acceptance: Current month grid renders with correct day offsets; today is highlighted; prev/next navigation works including year wrap

- [x] **6. JS modal** — openModal, closeModal, form population, focus trap, day-cell click
  - Acceptance: Clicking "+ Add Event" opens modal; clicking a day cell opens modal with date pre-filled; Escape/close-btn/overlay-click closes modal; Tab cycles within modal

- [x] **7. JS CRUD** — validateForm, saveEvent, renderEventChips, deleteEvent
  - Acceptance: Adding an event shows a chip on the correct day; editing updates the chip; deleting removes it; events persist after page reload; validation errors shown inline

- [x] **8. QA + review** — Edge cases, responsive check, review section
  - Acceptance: Feb 2024 (leap year) renders correctly; March 2026 (6-week grid) renders correctly; layout works at 320px and 1280px; review section added below

- [x] **9. a11y — Color contrast** — Raise muted text color to meet WCAG AA 4.5:1
  - `--muted: #70757a` on white = ~4.04:1, fails AA. Fix: darken to `#5f6368` (~5.9:1).

- [x] **10. a11y — Keyboard: day cells** — Make day cells keyboard-focusable
  - Add `tabindex="0"` + Enter/Space keydown handler in `renderGrid`. Add `:focus-visible` ring in CSS.

- [x] **11. a11y — Keyboard: event chips & overflow** — Make chips and "+N more" keyboard-accessible
  - Change `renderEventChips` to create `<button>` elements instead of `<span>`. Update CSS selectors.

- [x] **12. a11y — ARIA on form** — Link errors to inputs; mark required fields
  - Add `aria-required="true"` to title/date inputs. Add `aria-describedby="err-title"` / `aria-describedby="err-date"`. Add `aria-hidden="true"` to required asterisk spans.

- [x] **13. a11y — Live region for errors** — Announce validation errors to screen readers
  - Add `aria-live="polite"` to the `#err-title` and `#err-date` spans in HTML.

- [x] **14. a11y — Calendar grid ARIA** — Label the calendar grid and day cells
  - Add `role="grid"` + `aria-label="Calendar"` to `#calendar-grid`. Add `aria-label` (e.g. "March 25, 2026") to each day cell in `renderGrid`. Add `role="columnheader"` and full day name `aria-label` to day-header spans.

- [x] **15. a11y — Mini calendar day headers** — Single-letter headers need accessible labels
  - Add `aria-label` (e.g. "Sunday") to each mini day header span so S/M/T/W/T/F/S are unambiguous.

- [x] **16. a11y — Missing focus-visible styles** — Add focus rings to remaining buttons
  - `#btn-menu`, `#btn-add-event`, `#modal-close`, `.mini-nav button`, `.danger` button.

---

## Review

### What was built
A single-page calendar app in plain HTML/CSS/JS (no build tools, no dependencies).
Open `index.html` directly in any modern browser.

### Files
| File | Role |
|------|------|
| `index.html` | All markup: header, calendar grid, add/edit modal |
| `style.css` | Design tokens, 7-column CSS Grid, chips, modal, responsive breakpoints |
| `app.js` | State, localStorage CRUD, rendering, validation, event handling |

### Key decisions
- **localStorage schema**: key `"calendarEvents"`, value is a JSON array. Each event has `id`, `title`, `date` (YYYY-MM-DD), `time` (HH:MM or ""), `description`, `createdAt`, `updatedAt`.
- **Single modal** handles both Add and Edit — JS sets the mode via `state.editingId`.
- **CSS Grid** (`repeat(7, 1fr)`) for the month grid; leading/trailing cells show adjacent-month days in a muted style.
- **Today** highlighted with a filled circle on the day number.
- **Validation**: title required + max 100 chars; date required + must parse as a valid date. Errors shown inline with `aria-invalid` for accessibility.
- **Focus trap** keeps keyboard users inside the modal while it is open; Escape closes it.
- **Responsive**: wraps header on small screens, reduces cell height, keeps touch targets ≥ 44px.

### Edge cases handled
- Months starting on Sunday (firstWeekday = 0, no leading filler cells needed)
- 6-week months (e.g. March 2026 — grid auto-expands to 42 cells)
- February in leap years (correct day count via `new Date(year, month+1, 0).getDate()`)
- Year-boundary navigation (Dec → Jan, Jan → Dec)
- Corrupt or missing localStorage data (caught, defaults to empty array)
