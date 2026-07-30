# Scoring rubric

**This rubric is illustrative, not professional consulting.** It is a transparent
set of hand-written rules written for a demonstration prototype. It has not been
validated against real project outcomes, no industry body stands behind it, and a
different set of rules would produce different numbers. Every score shown in the
interface lists the individual rules that produced it so a reader can disagree
with the reasoning rather than argue with a number.

Implemented in `src/engine/`, as pure functions with no React, no browser APIs, no
storage, no network access, no clock reads, and no randomness. The same answers
always produce an identical assessment.

## Contents

- [Two independent headline scores](#two-independent-headline-scores)
- [Project Feasibility Score](#a-project-feasibility-score)
- [Route-specific Builder Fit](#b-route-specific-builder-fit)
- [Suitability and technical status](#suitability-and-technical-status)
- [Implementation routes](#implementation-routes)
- [Existing-solution check](#existing-solution-check)
- [Critical verdict gates](#critical-verdict-gates)
- [Verdicts](#verdicts)
- [Confidence](#confidence)
- [Risk scoring](#risk-scoring)
- [Maturity classification](#maturity-classification)
- [Known limitations](#known-limitations)

## Two independent headline scores

The two scores are computed by separate modules and are never combined.

**Builder Fit does not reduce Project Feasibility.** A project that is
technically feasible stays technically feasible when the current builder needs
help. What changes is the suitability label, the recommended route, the
conditions, and the timeline — not the feasibility score and not the technical
status. Three tests enforce this: identical project scores across a strong and a
weak builder, identical technical statuses and capability gaps across both, and a
case where high feasibility coexists with a Builder Fit below 50.

## A. Project Feasibility Score

Ten dimensions, weighted to exactly 100 (asserted by test). Each dimension starts
from a documented base and moves with signed rules; the result is clamped to
0–100.

| Dimension | Weight | Base | Principal drivers |
| --- | --- | --- | --- |
| Problem and business value | 12% | 55 | Specificity of the problem statement, described value, clarity of the solution, whether users are named |
| Scope realism | 10% | 55 | Must-have count, whether exclusions are named, scope against weekly hours and deadline |
| Data readiness | 10% | 50 | Whether data exists, authoritative source, data formats and locations, read-only identification |
| Technical feasibility | 14% | 70 | Whether required capabilities are within reach of any route, integration uncertainty, regulated data, conflicting expectations |
| Operational feasibility | 10% | 55 | Named owner, data updater, troubleshooter, human-controlled actions, use context |
| Financial practicality | 10% | 55 | Stated budget band against required maturity and per-seat exposure |
| Timeline feasibility | 8% | 55 | Deadline, flexibility, weekly hours, scope |
| Security and permissions | 10% | 65 | Data sensitivity, permission and security awareness, role separation against account expectations, hosting exposure |
| Hosting and sharing readiness | 8% | 60 | Hosting expectation, sharing needs, external audience against hosting plans |
| Maintenance and sustainability | 8% | 55 | Maintenance expectation against persistence needs, named maintainer and owner |

`overall = Σ(dimension score × weight) / 100`, rounded.

Each dimension returns: score, weight, weighted contribution, status, positive
drivers with points, negative drivers with points, evidence used, assumptions
used, unknowns affecting it, and one recommended corrective action.

Status bands: **Strong** ≥80 · **Adequate** 65–79 · **Watch** 50–64 · **Weak**
35–49 · **Critical** <35.

**Builder capability appears in none of these rules.** The technical feasibility
dimension states this on its own evidence list.

## B. Route-specific Builder Fit

Builder Fit is calculated **once per route**, because the same person can be a
strong fit for a spreadsheet workflow and a poor fit for a custom hosted
application. The headline figure is the fit for the recommended route; the engine
retains all eight.

Eleven ability factors, each on a 0–4 scale:

| Ability | Source |
| --- | --- |
| General technical experience | Stated directly |
| Coding experience | Stated directly |
| No-code and spreadsheet experience | Stated directly, raised for a confident spreadsheet user |
| Testing ability | Stated testing and troubleshooting confidence |
| Troubleshooting ability | Stated testing and troubleshooting confidence |
| Deployment ability | Derived from coding and general technical experience |
| Security-management ability | Derived from general technical experience, coding, and testing confidence |
| Maintenance ability | Derived from general technical experience, testing confidence, and building experience |
| Available technical guidance | Stated directly |
| Available developer support | Stated directly |
| Capacity for this route's learning burden | Derived from general technical experience and testing confidence |

Four of these are inferred rather than asked about; that is disclosed as an
assumption on every Builder Fit result.

**Per factor:** `gap = max(0, required − builder)`, `factorScore = 100 − gap × 25`.
Requirements and importance weights are per route (`src/data/routeProfiles.ts`).
The weighted sum gives the base score.

**Project-context uplift.** Where sensitive information is involved, the required
security-management level rises by one for every route.

**Support adjustments** (applied to the base): available guidance on a route with
a real learning burden (+up to 6); developer support on a route demanding ongoing
ownership (+8, or +4 for "could hire"); no developer support where code ownership
is expected and coding is short (−6); stated environment restrictions conflicting
with the route's working method (−8).

**Critical-gap caps.** On routes where the builder owns the implementation
(moderate or high ownership burden), a shortfall of two or more levels in an
ability the route leans on cannot be averaged away by strengths elsewhere: one
such gap caps the score at 54, three or more caps it at 39. This mirrors the
verdict gates — a critical shortfall is not a rounding matter.

## Suitability and technical status

Reported separately, and both shown.

**Suitability** (from Builder Fit): Suitable for the current builder ≥85 ·
Suitable with light guidance 70–84 · Requires technical support 55–69 · Requires
developer support 40–54 · Requires professional implementation 25–39 · Unsuitable
under current conditions <25.

Two honesty constraints on the top label: where sensitive information is involved,
"suitable for the current builder" additionally requires no security-management
shortfall and some support to fall back on; and where capability answers were left
unknown, the label cannot exceed "suitable with light guidance".

**Technical status** (from the route, never from the builder and never from the
user's own restrictions): Technically feasible · Technically feasible with
limitations · Technically blocked · Requires verification.

A route excluded by a restriction keeps its technical status. Exclusion is a
stated constraint, not a technical judgement, and the interface says so.

## Implementation routes

Eight routes, each profiled in `src/data/routeProfiles.ts` with capabilities
(persistence, multi-user, authentication, role-based access, audit history,
integrations, custom interface, each 0–3), supported maturity levels, builder
requirements and importance, required skills, technical support, hosting,
database, authentication requirements, security considerations, base effort band,
setup and monthly cost categories, maintenance level, scalability, vendor
dependency, strengths, limitations, and pre-selection conditions.

Route fit starts at **85** — below the ceiling, so genuine matches still register
— then applies: blocking capability gap −45 each; limiting gap −10 each; maturity
shortfall −12 per level (capped −36); cost category above what the budget absorbs
−20; effort beyond available capacity −18, or −28 beyond twice capacity; ownership
burden exceeding the stated maintenance expectation −12; sensitive data with no
role-based access −10; no change history where one is required −8; a suitable
existing product available +10 for off-the-shelf routes and −10 for high-ownership
builds; and a **stated preference, capped at +6**.

A preference of +6 cannot offset a −45 blocking gap, a security blocker, a budget
incompatibility, a missing capability, or an explicit restriction. Excluded and
technically blocked routes are removed from selection before scores are compared,
so they cannot win at all. Ties break by Builder Fit, then lower effort, then
fixed route order — so the result is deterministic.

**Exclusion types:** restricted method (the user ruled it out), environment
restriction (needs a local development environment the user has ruled out),
capability blocker (cannot provide a required capability), security blocker
(sensitive data with no access control). Every exclusion carries a reason.

Route profiles are deliberately neutral. The two AI-assisted coding routes carry
the same high ownership burden, high maintenance level, and level 3+ requirements
for testing and security management as a custom build, and Claude Code additionally
carries a local-environment requirement. Claude Artifact is capped at interactive
prototype with zero persistence and zero authentication. Tests assert that no
Claude-branded route wins the simple-tracker, CRM, workflow, or restricted-environment
scenarios, including when both are listed as preferred.

## Existing-solution check

Runs before any build route is recommended. Recognises mature product categories
(CRM, applicant tracking, project and task management, help desk, invoicing,
scheduling, document signing and forms, learning management) from the described
functionality.

Returns **Use an existing solution** when a category matches, the route is not
ruled out, at least three supporting signals hold, a budget exists, and at least
one of: no developer support for required accounts or permissions; ongoing records
with only light maintenance planned; or a team-scale user group.

## Critical verdict gates

Gates run **before** score bands, in this fixed order. A gate either **forces** a
verdict or **vetoes** verdicts the band would otherwise return. Vetoes are what
stop a high average from overriding one unacceptable risk.

| Order | Gate | Triggers when | Effect |
| --- | --- | --- | --- |
| 1 | Viable route | No route remains available | Forces **No-Go**, or **Do not build yet** when the only barrier is the user's own restrictions |
| 2 | Security | Sensitive data and no available route can enforce the required access control | Forces **No-Go** (regulated data) or **Do not build yet** |
| 3 | Human decision | The project touches hiring, legal, financial, security, or medical decisions | Vetoes **Proceed**; forces **Revise before building** where the features imply automatic action without a human step |
| 4 | Problem and user clarity | Neither the problem nor the users are clear | Forces **Revise before building**, or **Delay** when scope is unknown too; vetoes Proceed and Proceed carefully |
| 5 | Existing solution | A suitable product meets the essentials more safely and affordably | Forces **Use an existing solution** |
| 6 | Source of truth | A data-dependent project with no authoritative source | Vetoes **Proceed** and **Proceed carefully** — production use is not recommended |
| 7 | Capability | The recommended route does not fully cover a required capability | Vetoes **Proceed** |
| 8 | Budget | The recommended route's cost category exceeds the stated budget | Vetoes **Proceed** and **Proceed carefully**, and attaches a funding condition |
| 9 | Timeline | The deadline cannot be met | Forces **Delay** when the timeline is fixed; otherwise vetoes **Proceed** |
| 10 | Scope | A large must-have list exceeds the time available | Vetoes **Proceed** and **Proceed carefully** |

Vetoes demote along: Proceed → Proceed carefully → Conditional Go → Simplify
first → Revise before building → Delay → Do not build yet → No-Go.

Every gate is returned with its trigger state, detail, forced verdict, vetoed
verdicts, and conditions, so the decision path is inspectable.

## Verdicts

Only these nine are ever returned:

`Proceed` · `Proceed carefully` · `Conditional Go` · `Simplify first` ·
`Revise before building` · `Delay` · `Use an existing solution` ·
`Do not build yet` · `No-Go`

Score bands apply only when no gate forces an outcome: 80–100 with no risk above
3 → **Proceed**; 80–100 with a risk of 4 or 5 → **Proceed carefully**; 65–79 →
**Conditional Go**; 50–64 → **Simplify first** or **Revise before building**
depending on the weakest dimension; 35–49 → **Do not build yet**; 0–34 →
**No-Go**.

The verdict reports whether it was decided by a gate or by the band, which gate
decided it, the band that would otherwise have applied, its conditions (gate
conditions first, then the recommended route's own), and up to six next actions.

## Confidence

Calculated separately from feasibility, so a confident low score reads
differently from a tentative high one. **Confidence is not a probability that the
recommendation is correct**, and the interface says so.

Starts at 100. Deductions:

| Reason | Points |
| --- | --- |
| Unknown answer on an important question (project, problem, users) | 10 each |
| Other unknown answers | 4 each, capped at 24 |
| Prose answers too brief to interpret | 5 each, capped at 15 |
| Conflicting answers | 6 each, capped at 18 |
| No authoritative source of truth on a data-dependent project | 10 |
| Recommended route depends on unverified platform capabilities | 8 |
| No budget stated | 8 |
| Recommended route's real pricing unverified | 5 |
| Project ownership unclear | 6 |
| Maintenance responsibility unclear | 6 |
| Security requirements unclear where sensitive data is involved | 8 |

Bands: **High** ≥80 · **Moderate** 60–79 · **Low** <60. Every deduction is
returned with its detail, alongside a list of what would raise confidence.

**Never reduces confidence:** a valid "none", a "not applicable", a deliberately
excluded feature, or a clearly stated restriction. These are information, not
gaps. Enforced by test, including that list-style answers are never treated as
"too brief".

## Risk scoring

Sixteen categories, every one evaluated on the approved scale: **1** very low ·
**2** low · **3** moderate · **4** high · **5** very high.

Data · Device · Privacy · Security · Permission · Technical complexity ·
Integration · Builder capability · Operational · Maintenance · Vendor lock-in ·
AI accuracy · Cost · Timeline · Recovery · Source-of-truth.

Every risk returns category, score, score label, trigger, consequence,
mitigation, owner, residual risk, evidence, assumptions, and whether it blocks a
route or a verdict. For scores of **4 or 5** all fields are mandatory and asserted
by test.

Ownership is always a human role: Project owner · Data owner · Technical owner ·
Security owner · Hiring manager · Human reviewer · Developer · Vendor. **Never
"AI"**, asserted by test.

Builder capability risk is phrased explicitly as a delivery risk, and states that
it is not a statement that the project is infeasible.

## Maturity classification

Levels: Concept · Visual mockup · Interactive prototype · MVP · Pilot ·
Production-ready system.

The engine derives the maturity the project **requires** (from persistence,
multi-user, authentication, role separation, data sensitivity, and consequential
domain), classifies what each route **supports**, and lists production blockers
per route.

A route is classified production-ready only if it can support all ten production
requirements: persistent storage, authentication, role-based permissions, backups
with a tested restore, audit history, security controls, hosting with a named
operator, monitoring, a recovery plan, and a named maintenance owner with time
allocated.

**A frontend-only prototype is never production-ready** — including this
assessment tool itself. It can demonstrate a workflow and settle requirements, but
it cannot hold records, identify users, enforce permissions, keep an audit
history, store documents securely, send messages, or support several people
working together.

## Known limitations

1. The rubric is hand-written and unvalidated. It encodes judgement, not evidence.
2. It can only see what the intake collected, and it does not fill gaps with guesses.
3. Route profiles describe typical behaviour. Specific products and plans differ and must be verified.
4. Cost and timeline outputs are broad estimates and categories, never quotations.
5. Consequential-domain detection is keyword-based over the answers given, so an unusual description may not be recognised. It errs towards flagging.
6. Two of the eight routes overlap in practice: AI-assisted coding and Claude Code are build *methods*, while custom hosted web application is a delivery *target*. They are scored separately because they carry different environment requirements and learning burdens.
7. Results require human review, and must not be used to make final legal, financial, hiring, security, or implementation decisions.
