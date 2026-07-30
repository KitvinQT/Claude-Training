# Scoring rubric

**The rubric is illustrative.** It is a transparent, hand-written set of rules for
a demonstration prototype, not a validated industry model. Every score shown in
the interface lists the individual rules that produced it.

Structure and weights below are agreed. The per-answer rule tables and the
golden-fixture tests are built in **Phase 2**; weights are final only once those
tests exist.

## Two independent headline scores

The scores are computed separately and never combined into a single number.
Builder Fit does not reduce Project Feasibility. A project that is technically
feasible remains technically feasible when the current builder needs help — that
situation changes the *suitability label*, the *recommended route*, and the
*conditions*, not the feasibility score.

### A. Project Feasibility Score (0–100)

| Dimension | Proposed weight |
| --- | --- |
| Problem and business value | 12% |
| Scope realism | 12% |
| Data readiness | 11% |
| Technical feasibility | 14% |
| Operational feasibility | 10% |
| Financial feasibility | 10% |
| Timeline feasibility | 9% |
| Security and permissions | 10% |
| Hosting and sharing | 6% |
| Maintenance and sustainability | 6% |

### B. Builder Fit Score (0–100)

| Dimension | Proposed weight |
| --- | --- |
| Current builder experience | 16% |
| Coding or no-code experience | 12% |
| Ability to test | 10% |
| Ability to troubleshoot | 12% |
| Available technical support | 12% |
| Available developer support | 10% |
| Learning burden (inverse: lower burden scores higher) | 10% |
| Ability to deploy | 8% |
| Ability to maintain the solution | 10% |

## Suitability labels

Reported alongside both scores, derived from Builder Fit against the recommended
route's requirements:

- Technically feasible
- Suitable for the current builder
- Suitable with light guidance
- Requires technical support
- Requires developer support
- Requires professional implementation

## Final verdicts (approved set — visible wording)

Exactly one of these nine is shown. Internal score bands are an implementation
detail and are never displayed as the verdict:

`Proceed` · `Proceed carefully` · `Conditional Go` · `Simplify first` ·
`Revise before building` · `Delay` · `Use an existing solution` ·
`Do not build yet` · `No-Go`

### Verdict selection precedence

Gates are evaluated in order; the first match wins. Bands apply only when no gate
matches.

1. **No-Go** — every viable route is restricted, or an unmitigated risk scores 5
   on security, privacy, or permissions.
2. **Use an existing solution** — an existing SaaS or off-the-shelf route covers
   the must-have features and clearly outranks every build route.
3. **Delay** — the project is otherwise sound but the deadline cannot be met by
   any route, or a prerequisite is not yet in place.
4. **Revise before building** — the problem, users, or source of truth are too
   unclear to assess (drives confidence low).
5. **Simplify first** — the core is viable but scope exceeds the available budget,
   time, or capacity.
6. Otherwise by Project Feasibility band:
   - 80–100, no risk scored 4 or 5 → **Proceed**
   - 80–100, at least one risk scored 4 or 5 → **Proceed carefully**
   - 65–79 → **Conditional Go** (stated conditions required)
   - 50–64 → **Simplify first** or **Revise before building**, whichever the
     weakest dimension indicates
   - 35–49 → **Do not build yet**
   - 0–34 → **No-Go**

Builder Fit contributes conditions and the suitability label. It can move a
verdict from `Proceed` to `Proceed carefully` or add conditions to a
`Conditional Go`; it cannot by itself produce `No-Go`.

## Confidence level

Reported separately from both scores, so a confident low score reads differently
from a tentative high score. Start at 100; subtract for missing and vague inputs
(unknown answers, missing budget or deadline, undefined source of truth); floor
at 25. Bands: High ≥80 · Moderate 60–79 · Low <60. Every deduction is listed.

## Risk scale

| Score | Meaning |
| --- | --- |
| 1 | Very low risk |
| 2 | Low risk |
| 3 | Moderate risk |
| 4 | High risk |
| 5 | Very high risk |

Any risk scored **4 or 5** is shown with the full record: risk · trigger ·
consequence · mitigation · owner · residual risk.

### Risk categories

Data · Device · Privacy · Security · Permission · Technical complexity ·
Integration · Builder capability · Operational · Maintenance · Vendor lock-in ·
AI accuracy · Cost · Timeline · Recovery · Source-of-truth.

## Implementation routes compared

Existing SaaS · Chat-only workflow · Spreadsheet or document workflow · No-code
solution · Claude Artifact · AI-assisted coding · Claude Code · Custom hosted web
application.

Each route carries a profile: capability required, effort band, cost categories,
feature ceiling, hosting need, multi-user support, data-persistence support, and
security posture. Routes the user restricts are excluded with the reason shown,
not silently dropped.

## Cost output rules

Primary outputs are effort and categories, never invented currency:

- Estimated effort-hour range (low / expected / high)
- Tooling cost category
- Setup cost category
- Monthly cost category
- Maintenance effort
- Costs requiring verification

Dollar amounts are computed **only** when the user supplies an hourly rate,
confirmed subscription prices, confirmed hosting prices, or confirmed platform
prices. Until then the interface displays: **"Pricing must be verified before
implementation."**

## Determinism

The engine is pure functions over the intake answers: the same answers always
produce the same assessment, with no randomness, no clock dependence, and no
network access.
