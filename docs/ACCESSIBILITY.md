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

## Verification results

Verified against the production build. Rerun with `npm run test:run` for the
in-suite checks; the browser checks were run with axe-core injected into headless
Chromium.

| Check | Result |
| --- | --- |
| axe-core, welcome screen | **0 violations at any severity** |
| axe-core, intake screen | **0 violations at any severity** |
| axe-core, review screen | **0 violations at any severity** |
| axe-core, report screen | **0 violations at any severity** |
| Colour contrast (axe, real layout) | **0 violations** across all four screens |
| Heading order | No skipped levels on any screen |
| Landmarks | One `h1` per screen; all content inside a landmark |
| Tables | 10 tables, all with a caption and `scope="col"` headers |
| Wide tables | Each in its own labelled, focusable scroll region; the page never scrolls sideways |
| Touch targets | No interactive target under 44px |
| Focus ring | 3px solid `#2E6FB7`, visible on every control |
| Keyboard | Tab reaches all controls; Enter opens a figure disclosure; Enter selects an evidence tab; nav links resolve to real sections |
| Reduced motion | Bar transitions reduced to 0.00001s (effectively none); the staged generation step is skipped entirely |
| Horizontal overflow | None at 320, 375, 768, 1024, 1440px, or at 200% zoom |
| Figures | 4 figures, each `role="img"` with a text description and a table alternative holding the same values |
| Provenance | 209 provenance labels on the report; every numeric result carries one |

`axe-core` runs inside the test suite too (`src/screens/finalPass.test.tsx`), on
all four screens. Contrast is disabled there because jsdom has no layout engine,
and is covered by the browser run above instead.

## Known gaps

- **No manual screen-reader pass.** Automated checks and keyboard verification
  pass, but nobody has driven the report with a screen reader end to end.
- **Figures are one image each.** Their values are read from the table
  alternative, which is the standard pattern, but it is one extra step for
  screen-reader users.
- **The intake transcript grows long.** Focus management handles it; there is no
  collapse for older turns.
