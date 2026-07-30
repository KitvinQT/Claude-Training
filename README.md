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

1. **Project Feasibility Score** — ten weighted dimensions: problem and business
   value (12%), scope realism (10%), data readiness (10%), technical feasibility
   (14%), operational feasibility (10%), financial practicality (10%), timeline
   feasibility (8%), security and permissions (10%), hosting and sharing readiness
   (8%), maintenance and sustainability (8%).
2. **Builder Fit Score** — eleven abilities, scored **once per route**: general
   technical experience, coding, no-code and spreadsheet, testing,
   troubleshooting, deployment, security management, maintenance, available
   guidance, available developer support, and the learning burden of that specific
   route. The same builder can be a strong fit for a spreadsheet workflow and a
   poor fit for a custom hosted application, so the engine keeps a separate result
   for all eight routes and reports the recommended route's as the headline.

Builder fit is reported alongside, never folded into, project feasibility. A
project that is technically feasible stays technically feasible even when the
current builder needs guidance or developer support — what changes is the
suitability label, the route, the conditions, and the timeline.

Two labels are always shown separately:

- **Suitability** — suitable for the current builder · suitable with light
  guidance · requires technical support · requires developer support · requires
  professional implementation · unsuitable under current conditions
- **Technical status** — technically feasible · technically feasible with
  limitations · technically blocked · requires verification

The visible verdict is always one of nine: Proceed · Proceed carefully ·
Conditional Go · Simplify first · Revise before building · Delay · Use an existing
solution · Do not build yet · No-Go. Ten critical gates run before any score band,
so a high average can never override one unacceptable risk.

## How the intake works

Nine grouped conversational steps collect 43 answers: project idea and problem ·
users and sharing · features and scope · data and source of truth · budget and
timeline · builder capability and support · implementation, hosting, and sharing
preferences · restricted methods and permissions · security, maintenance, and
ownership.

- **Nothing is invented on your behalf.** Every question offers "Not sure / skip",
  which records the answer as **Unknown** — no default is substituted. Unknowns are
  listed on the review screen and will reduce the assessment's confidence level.
  Leaving an important question unknown shows a notice, never a block.
- **Some questions accept an explicit "none"**, which counts as information
  provided rather than a gap.
- **Navigation is backward-free, forward-gated.** Any step already reached can be
  revisited from the progress indicator or the transcript; steps ahead stay
  disabled until the questions before them are answered or skipped. The review
  screen is reachable only once all nine steps are addressed.
- **The progress indicator distinguishes** current, completed, started-but-incomplete,
  and not-yet-available steps, and flags steps containing unknown answers — with
  text, not colour alone.
- **Intake completeness is not a feasibility score.** It counts answered questions
  and says so on screen.

## The assessment engine

`src/engine/` holds the whole assessment as small, pure, deterministic modules —
no React, no browser APIs, no storage, no network, no clock, no randomness. The
same answers always produce an identical assessment.

| Module | Responsibility |
| --- | --- |
| `normalizeAnswers` | Turns raw answers into typed signals, derived requirements, and conflicts |
| `scoreProjectDimensions` | Project Feasibility across ten weighted dimensions |
| `scoreBuilderByRoute` | Builder Fit, calculated once per route from eleven abilities |
| `scoreRoutes` | Capability match, technical status, exclusions, fit, effort, conditions |
| `existingSolution` | Whether an off-the-shelf product should be preferred to building |
| `buildRisks` | All sixteen risk categories on the 1–5 scale |
| `estimateCost` | Effort hours and cost categories — never currency |
| `estimateTimeline` | Seven phases, each as an approved duration band |
| `determineMaturity` | What the project requires and what each route supports |
| `determineConfidence` | How much the assessment had to work with |
| `buildSourceOfTruth` | Authoritative source, read-only data, approval owner |
| `safeguards` | Human-decision rules and sensitive-data handling |
| `determineVerdict` | Ten critical gates, then score bands, then vetoes |
| `generateAssessment` | Orchestrates the above into one assessment |

Two rules the engine enforces throughout:

1. **Builder Fit never lowers Project Feasibility.** A feasible project stays
   feasible when the builder needs help; what changes is the suitability label,
   the route, the conditions, and the timeline.
2. **No invented money.** Cost is effort hours plus categories, always alongside
   *"Pricing must be verified before implementation."*

Golden fixtures in `src/engine/__fixtures__/` pin seven fictional scenarios, and
`src/engine/__tests__/` asserts determinism, score bounds, weight totals, gate
behaviour, risk completeness, provenance on every numeric result, and the absence
of route bias.

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
| 1 | Welcome screen, grouped chat-style intake (9 steps), progress indicator, Review Project Details screen | Complete |
| 2 | Deterministic scoring engine, separate Project Feasibility and Builder Fit scores, risk engine, route comparison logic, rubric documentation and tests | Complete |
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
- `docs/SCORING-RUBRIC.md` — dimensions and weights, route-specific Builder Fit, confidence deductions, critical gates, verdicts, risk scoring, maturity classification, known limitations
- `docs/ROUTE-PROFILES.md` — the eight route profiles, cost assumptions, timeline assumptions
- `docs/SAFEGUARDS.md` — human-approval rules, recruitment-scenario safeguards, source-of-truth rules
- `docs/HOSTING-LATER.md` — hosting options to consider after review
- `docs/ACCESSIBILITY.md` — accessibility targets and checks
