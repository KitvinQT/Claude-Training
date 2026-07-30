# The Feasibility Architect (Prototype)

An interactive, **frontend-only** feasibility-assessment prototype. It asks about a
project idea through a short chat-style intake, then produces a structured
assessment: two separate headline scores, feasibility scorecards, an
implementation-route comparison, a risk register, effort and cost categories, an
MVP recommendation, a phased roadmap, and a final verdict.

## What this is not

- It is **not a production system**.
- Its scoring rubric is **illustrative**, not an industry standard.
- Its results **require human review**.
- Its estimates are **not vendor quotes**. Pricing must be verified before implementation.
- It must not be used to make final legal, financial, hiring, security, or
  implementation decisions.

## First-version constraints

| Constraint | Detail |
| --- | --- |
| Frontend only | No backend, no database, no authentication, no user accounts |
| No persistence | In-memory state only. Refreshing or closing the page clears the assessment |
| No network calls | All scoring runs locally in the browser. No external APIs, CDNs, fonts, or analytics |
| No secrets | No API keys or credentials anywhere in this repository |
| No deployment | Not published or hosted. Reviewed locally via the dev server or the static build |
| Fictional data only | Every sample scenario, name, and figure is invented or sanitised. No real Timber Creek Virtual candidate, client, financial, or operational data |

## Two separate headline scores

The prototype deliberately keeps these apart:

1. **Project Feasibility Score** — problem and business value, scope realism, data
   readiness, technical feasibility, operational feasibility, financial
   feasibility, timeline feasibility, security and permissions, hosting and
   sharing, maintenance and sustainability.
2. **Builder Fit Score** — builder experience, coding/no-code experience, ability
   to test, ability to troubleshoot, available technical support, available
   developer support, learning burden, ability to deploy, ability to maintain.

Builder fit is reported alongside, never folded into, project feasibility. A
project that is technically feasible stays technically feasible even when the
current builder needs guidance or developer support. Suitability is expressed
separately as one of: technically feasible · suitable for the current builder ·
suitable with light guidance · requires technical support · requires developer
support · requires professional implementation.

## Value labelling

Every figure and statement carries exactly one provenance label: **From your
answer · Derived from your answers · Estimate · Assumption · Demonstration data ·
Unknown · Requires verification**. See `docs/LABELLING.md`.

## Getting started

```bash
npm install
npm run dev        # local dev server
npm run typecheck  # TypeScript, no emit
npm run test:run   # unit tests (Vitest + React Testing Library)
npm run build      # typecheck + static build into dist/
npm run preview    # serve the static build locally
```

The build uses a relative base path, so it runs from any directory or sub-path
when served. Review the build with `npm run preview` — this multi-file build needs
a local server, because browsers block external module and stylesheet loads over
`file://`. The self-contained single-file build added in Phase 5 will open
directly from the file system.

## Technology

Vite · React 18 · TypeScript (strict) · hand-written CSS with design tokens ·
Vitest + React Testing Library · Recharts and Playwright are added in later
phases. No UI framework, no CSS framework, no runtime dependencies beyond React.

## Colour palette

Provisional approximations of a light Timber Creek Virtual look. **These are not
confirmed official brand codes** and must be replaced with official values before
any external use.

| Token | Hex |
| --- | --- |
| White | `#FFFFFF` |
| Soft gray | `#F4F6F8` |
| Pale blue | `#E8F1FA` |
| Medium blue | `#2E6FB7` |
| Deep navy | `#14294B` |
| Charcoal | `#333A42` |
| Near-black accent | `#0B0F14` |

## Build phases

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Repository scaffold, README, design tokens, application shell, prototype disclaimer, test configuration | Complete |
| 1 | Welcome screen, grouped chat-style intake (9 steps), progress indicator, Review Project Details screen | Not started |
| 2 | Deterministic scoring engine, separate Project Feasibility and Builder Fit scores, risk engine, route comparison logic, rubric documentation and tests | Not started |
| 3 | Executive summary, scorecards, route comparison, risk register, cost and timeline, MVP, roadmap, evidence and assumptions, final recommendation | Not started |
| 4 | Charts, table alternatives for every chart, responsive layout, accessibility, print view | Not started |
| 5 | Fictional demo scenarios, end-to-end testing, static production build, demo script, screenshots, review summary | Not started |

## Possible future features (not in this version)

Saved assessments · persistent drafts · browser storage or a database ·
assessment history · exportable branded reports · hosting and a shareable link.
Hosting options for later are documented in `docs/HOSTING-LATER.md`; nothing is
deployed at this stage.

## Documentation

- `docs/PLAN.md` — approved implementation plan and revisions
- `docs/LABELLING.md` — the seven provenance labels and when to use each
- `docs/SCORING-RUBRIC.md` — scoring dimensions, weights, verdicts, risk scale
- `docs/HOSTING-LATER.md` — hosting options to consider after review
- `docs/ACCESSIBILITY.md` — accessibility targets and checks
