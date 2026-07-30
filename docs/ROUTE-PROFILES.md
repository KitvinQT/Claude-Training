# Route profiles, cost, and timeline assumptions

Source of truth for this document: `src/data/routeProfiles.ts`,
`src/engine/estimateCost.ts`, and `src/engine/estimateTimeline.ts`.

## Capability matrix

Levels: **0** absent · **1** minimal · **2** platform-provided · **3** full control.

| Route | Persist | Multi-user | Auth | Roles | Audit | Integrations | Custom UI | Maturity ceiling |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | --- |
| Existing SaaS product | 3 | 3 | 3 | 2 | 2 | 2 | 1 | Production-ready |
| Chat-only workflow | 0 | 0 | 0 | 0 | 0 | 0 | 0 | Interactive prototype |
| Spreadsheet or document workflow | 2 | 2 | 2 | 1 | 1 | 1 | 1 | Pilot |
| No-code platform | 2 | 2 | 2 | 2 | 2 | 2 | 2 | Production-ready |
| Claude Artifact | 0 | 0 | 0 | 0 | 0 | 0 | 2 | Interactive prototype |
| AI-assisted coding | 3 | 3 | 3 | 3 | 3 | 3 | 3 | Production-ready |
| Claude Code | 3 | 3 | 3 | 3 | 3 | 3 | 3 | Production-ready |
| Custom hosted web application | 3 | 3 | 3 | 3 | 3 | 3 | 3 | Production-ready |

A level of 3 on a coded route means "you can build it", not "it comes for free".
That distinction is why those routes carry a high ownership burden and a capability
multiplier on effort.

## Ownership, cost, and dependency

| Route | Base effort (moderate scope) | Setup | Monthly | Maintenance | Ownership | Vendor dependency | Local environment |
| --- | --- | --- | --- | --- | --- | --- | :-: |
| Existing SaaS product | 8–30 h | Low | Moderate | Low | Low | High | No |
| Chat-only workflow | 1–4 h | Free/existing | Free/existing | Minimal | Minimal | Moderate | No |
| Spreadsheet or document workflow | 4–20 h | Free/existing | Free/existing | Low | Low | Low | No |
| No-code platform | 20–80 h | Low | Moderate | Moderate | Moderate | High | No |
| Claude Artifact | 2–10 h | Free/existing | Free/existing | Minimal | Minimal | Moderate | No |
| AI-assisted coding | 40–160 h | Low | Low | High | High | Low | No |
| Claude Code | 30–120 h | Low | Low | High | High | Low | **Yes** |
| Custom hosted web application | 80–320 h | Moderate | Moderate | High | High | Low | No |

## Builder requirement levels per route

Required ability level 0–4 per route. Compared against the builder's assessed
level; a one-level shortfall costs 25 points on that factor.

| Route | Gen. tech | Coding | No-code | Testing | Trouble-shooting | Deploy | Security | Maint. | Guidance | Dev support | Learning burden |
| --- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Existing SaaS | 1 | 0 | 1 | 1 | 1 | 0 | 2 | 1 | 1 | 0 | 2 |
| Chat-only | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| Spreadsheet/doc | 1 | 0 | 2 | 1 | 1 | 0 | 1 | 1 | 0 | 0 | 1 |
| No-code | 2 | 0 | 2 | 2 | 2 | 1 | 2 | 2 | 1 | 0 | 3 |
| Claude Artifact | 1 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| AI-assisted coding | 3 | 3 | 0 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 4 |
| Claude Code | 3 | 3 | 0 | 3 | 3 | 3 | 3 | 3 | 2 | 2 | 3 |
| Custom hosted | 3 | 3 | 0 | 3 | 3 | 3 | 4 | 4 | 2 | 3 | 4 |

Where sensitive information is involved, the required security-management level
rises by one for every route.

## Cost assumptions

**No dollar values, hourly rates, subscription prices, or vendor prices are
generated anywhere in the engine.** A test asserts that no currency figure appears
in the cost, timeline, route, or verdict output.

Outputs are:

- Estimated effort-hour range (low to high)
- Setup cost category
- Monthly cost category
- Maintenance effort category
- Potential external-support requirement
- Costs requiring verification
- Cost confidence (low / moderate / high)
- Main cost drivers

Categories: Free or existing tools only · Low · Moderate · High · Very high · Not
financially justified.

**Every cost block carries:** *Pricing must be verified before implementation.*

Dollar amounts may only ever be calculated once the user supplies an hourly rate,
confirmed subscription prices, confirmed hosting prices, or confirmed platform
prices. The engine has no path to invent them.

### How effort is derived

```
route base band
  × scope multiplier      tiny 0.5 · small 0.7 · moderate 1.0 · large 1.5 · very large 2.2
  × capability multiplier high-ownership routes: 1 + 0.2 per required capability
                          platform routes: 1.1 where any capability is required
  × builder multiplier    fit ≥85 → 0.9 · ≥70 → 1.0 · ≥55 → 1.3 · ≥40 → 1.6 · below → 2.0
```

The builder multiplier lengthens the work; it never changes technical feasibility.
Ranges are deliberately broad. Effort is labelled **Estimate**, and
**Demonstration data** when it comes from a fictional scenario.

## Timeline assumptions

Seven phases are estimated separately: Validation · Prototype · MVP · Pilot ·
Production-ready implementation · Training and documentation · Ongoing maintenance.

Each is expressed as one of the approved duration bands only:

30 minutes to 1 hour · 2 to 4 hours · 1 to 2 days · 3 to 5 days · 1 to 2 weeks ·
2 to 4 weeks · 1 to 3 months · More than 3 months

Phases are a share of the builder-adjusted effort (validation 8%, prototype 25%,
MVP 70%, pilot 100%, production 160%, training and documentation 15%, ongoing
maintenance recurring per month). Two adjustments stretch the later phases by one
band: no named owner (approval delay) on pilot and production, and sensitive data
on production.

Factors reported with the estimate: route, scope, data preparation, integrations,
security requirements, testing confidence, documentation, deployment, and approval
delays. A phase the recommended route cannot reach is marked unachievable with the
reason.

The deadline assessment compares the hours needed to reach the required maturity
against the weekly hours available before the deadline, and says plainly whether
it is achievable on these estimates.

## Route overlap, stated honestly

AI-assisted coding and Claude Code are build *methods*; custom hosted web
application is a delivery *target*. All three can produce the same artefact. They
are scored as separate routes because they differ in environment requirements
(Claude Code normally needs a development environment), learning burden, and base
effort. The interface should present them as related rather than as three
unrelated options.
