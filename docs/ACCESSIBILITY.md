# Accessibility approach

Target: **WCAG 2.2 level AA**. Accessibility is built in per phase, then verified
end to end in Phase 4.

## Committed behaviours

| Area | Commitment |
| --- | --- |
| Structure | Semantic landmarks (`header`, `main`, `footer`, `nav`); exactly one `h1` per screen; heading order never skips a level |
| Keyboard | Every interaction reachable and operable by keyboard alone; no pointer-only controls; skip link to `#main` |
| Focus | Visible 3px focus ring on all interactive elements; focus moves to the new question on each intake step and to the report heading when the assessment is generated |
| Forms | Real `input`/`select`/`textarea` elements inside `fieldset`/`legend`; every control has a programmatic label; errors are described with `aria-describedby` |
| Live regions | Chat transcript is `role="log"` with `aria-live="polite"`; progress uses `role="progressbar"` plus a text equivalent; assessment completion is announced |
| Status | Never colour alone — status always pairs an icon or shape with text |
| Contrast | Text ≥ 4.5:1, large text and UI boundaries ≥ 3:1, verified against the token palette |
| Charts | Each chart is a `figure` with `role="img"`, a descriptive `aria-label`, a visible caption, and a "View as table" disclosure containing the same values |
| Motion | `prefers-reduced-motion` disables the analysing animation and chart transitions |
| Zoom / reflow | Usable at 200% zoom and at 320px width with no horizontal page scroll |
| Language | Plain language; abbreviations expanded on first use |

## Verification

- `vitest-axe` checks on each screen in Phase 4 (zero serious or critical violations).
- Playwright keyboard-only walkthrough of the full flow.
- Manual checks: tab order, screen-reader pass over the report, 200% zoom, 320px width.
- Contrast checked for every foreground/background token pair in `tokens.css`.

## Known gaps in this phase

Phase 0 ships the shell only: skip link, landmarks, single `h1`, focus styling,
reduced-motion handling, and text-plus-colour labelling. Live regions, form
semantics, chart alternatives, and the automated axe suite arrive with the screens
they belong to.
