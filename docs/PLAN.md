# Approved implementation plan

Frontend-only, browser-based prototype. No backend, no database, no
authentication, no external APIs, no secrets, no persistence, no deployment.

## Technology

Vite · React 18 · TypeScript (strict) · hand-written CSS with design tokens ·
Recharts (Phase 4) · Vitest + React Testing Library · Playwright (Phase 5) ·
single-file static build option (Phase 5).

## Screens

| ID | Screen | Contents |
| --- | --- | --- |
| S1 | Welcome | Purpose, how it works, what it is not, start / load demo scenario |
| S2 | Intake | Chat-style intake in 9 grouped steps with a progress indicator |
| S3 | Review Project Details | All answers grouped, inline edit, completeness meter |
| S4 | Feasibility Report | Executive summary, two headline scores, verdict, confidence, scorecards, route comparison, risk register, cost and timeline, charts, MVP, roadmap, evidence panel, final recommendation |
| S5 | Print view | Print-optimised stylesheet over the same report content |

## Flow

Welcome → Intake (9 steps) → Review → generate (local, deterministic) → Report →
edit answers and re-run, or start over. Nothing is saved; refreshing clears state.

## Grouped intake steps

1. Project idea and problem
2. Users and sharing requirements
3. Features and scope
4. Data and source of truth
5. Budget and deadline
6. Builder capability and technical support
7. Hosting and implementation preferences
8. Restricted methods
9. Security concerns and maintenance expectations

## Two separate headline scores

Project Feasibility (10 dimensions) and Builder Fit (9 dimensions) are computed
and displayed independently; see `docs/SCORING-RUBRIC.md`. Builder fit is never
folded into feasibility. Suitability is a separate label.

## Verdicts

The nine approved verdicts only: Proceed · Proceed carefully · Conditional Go ·
Simplify first · Revise before building · Delay · Use an existing solution ·
Do not build yet · No-Go.

## Routes compared

Existing SaaS · Chat-only workflow · Spreadsheet or document workflow · No-code ·
Claude Artifact · AI-assisted coding · Claude Code · Custom hosted web application.

## Demonstration scenarios (all fictional)

1. **TCV Recruitment and Candidate Assessment Portal** (primary) — candidate
   details, L1/L2/L3 interview progress, recruiter notes, interview summary
   reports, candidate comparison, pass / conditional pass / fail recommendations,
   hiring-stage progress, candidate communications, basic recruitment metrics.
2. Client intake and proposal tracker (optional).
3. Internal scheduling and reminder workflow (optional).

No real candidate, client, financial, credential, or operational data is used.

## Charts (Phase 4)

Dimension radar (project and builder scorecards) · route fit bars · effort/cost
range bars · risk heatmap on the 1–5 scale · confidence gauge · roadmap phase bars
· static decision-flow diagram. Every chart has a table alternative and is driven
by computed values or clearly labelled demonstration data — no decorative invented
figures.

## Phases

| Phase | Scope |
| --- | --- |
| 0 | Repository scaffold, README, design tokens, application shell, prototype disclaimer, basic testing configuration |
| 1 | Welcome screen, grouped chat-style intake, progress indicator, Review Project Details screen |
| 2 | Deterministic scoring engine, separate Project Feasibility and Builder Fit scores, risk engine, route comparison logic, scoring documentation and tests |
| 3 | Executive summary, scorecards, route comparison, risk register, cost and timeline, MVP, roadmap, evidence and assumptions, final recommendation |
| 4 | Charts, table alternatives, responsive layout, accessibility, print view |
| 5 | Fictional demo scenarios, end-to-end testing, static production build, demo script, screenshots, review summary |

Each phase is committed to `claude/feasibility-architect-plan-y7mxee` and reported
before the next begins.

## Acceptance criteria

1. All required interface elements present and reachable.
2. All intake fields collected across 9 conversational steps, with working
   progress, back, and "not sure" handling.
3. All 8 routes compared with fit, effort, cost categories, ceiling, and blockers;
   restricted routes visibly excluded with reasons.
4. Project Feasibility and Builder Fit shown as separate headline scores, plus a
   suitability label and one of the nine approved verdicts, with a confidence level.
5. Risks use the 1–5 scale; every risk scored 4–5 shows risk, trigger,
   consequence, mitigation, owner, and residual risk.
6. Cost output is effort hours plus cost categories, with "Pricing must be
   verified before implementation." No invented rates.
7. Every displayed value carries one of the seven provenance labels.
8. Every chart has a text-table equivalent.
9. Different intake sets produce different, defensible reports; identical inputs
   reproduce identically.
10. Zero serious or critical axe violations; complete keyboard-only run; no
    horizontal scroll at 320px; usable at 200% zoom.
11. Zero runtime network requests; no secrets in the repository; no browser storage.
12. Light theme throughout, within the provisional palette.
13. Prototype disclaimers visible on every screen and in the print view.

## Excluded by design

Backend · database · authentication and accounts · real AI or API calls · external
APIs, CDNs, fonts, analytics · secrets · email, calendar, or CRM connections · file
upload or local file writing · browser storage and persistence · assessment history
· multi-user collaboration · deployment, hosting, and custom domains · any real
Timber Creek Virtual data.

## Risks and limitations

Heuristic rubric rather than validated model (mitigated by publishing the rubric
and showing every driver) · risk of false precision (mitigated by ranges,
provenance labels, and effort-before-currency) · potential bias toward
Claude-based routes (mitigated by neutral route profiles and a fixture test in
which a non-build route wins for a simple project) · no persistence, so a refresh
loses work (stated on screen) · output is illustrative and must not drive a real
commitment.
