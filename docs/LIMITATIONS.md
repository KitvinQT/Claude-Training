# Limitations and hosting options

Read this before showing the prototype to anyone outside the immediate team, and
before considering hosting.

## What this prototype is

An interactive feasibility-assessment prototype that runs entirely in a browser.
It collects 43 answers across nine conversational steps, applies a published set
of deterministic rules, and renders a sixteen-section report.

## What it is not

- **Not a production system.** No backend, no database, no authentication, no
  persistence.
- **Not professional consulting.** The rubric is hand-written for a demonstration
  and has never been validated against real project outcomes.
- **Not a decision-maker.** It must not be used to make final legal, financial,
  hiring, security, or implementation decisions.
- **Not a quoting tool.** Every cost output is an effort range or a category.
  Pricing must be verified before implementation.

## Limitations of the assessment itself

1. **The rubric encodes judgement, not evidence.** Weights, bases, and thresholds
   are defensible but unvalidated. A different rubric would give different
   numbers. Some fixtures sit close to a band edge, so a small rule change could
   move a verdict.
2. **It can only see what the intake collected.** It does not fill gaps with
   guesses: unknown answers stay unknown, reduce confidence, and are listed.
3. **Route profiles describe typical behaviour**, not specific products. Any
   platform's real permission model, audit history, export terms, and pricing must
   be verified.
4. **Consequential-domain detection is keyword-based** over the answers given. An
   unusual description of a hiring, legal, or financial process may not be
   flagged. It errs towards flagging; a human should still confirm.
5. **Effort and duration are broad ranges.** They are not benchmarked against
   comparable delivered projects, and they do not account for organisational
   delays beyond a coarse approval allowance.
6. **Two routes overlap by design.** AI-assisted coding and Claude Code are build
   methods; a custom hosted web application is a destination. They are scored
   separately because they differ in environment requirements and learning
   burden, and the report explains the overlap rather than hiding it.
7. **Route selection is capability-led, not builder-led.** The recommended route
   can be one the current builder cannot execute alone — deliberately, so a
   builder gap never makes a project look infeasible. The suitability label,
   conditions, and builder-capability risk carry that message instead.
8. **The safeguards cannot enforce anything.** They describe what should be
   required. This is an assessment tool, not a control.
9. **Not legal advice.** Sensitive-data guidance is generic and names no
   jurisdiction's obligations.

## Limitations of the prototype as software

| Limitation | Detail |
| --- | --- |
| Nothing is saved | Refreshing or closing the page clears all answers and the assessment. There is no recovery. |
| Single user, single session | No accounts, no sharing, no collaboration, no history. |
| No exports | No save, export, print-to-file, share, publish, or download controls. The browser's own print dialogue works, using the print stylesheet. |
| Screen-reader coverage is partial | Automated checks pass with zero violations at every severity, and keyboard operation is verified. A full manual screen-reader pass has not been done. |
| Bundle size | About 121 kB gzipped. Fine for internal use; not optimised. |
| One demonstration scenario | The fictional TCV recruitment portal. No further scenarios were added. |
| Intake transcript grows long | By step 9 the page is tall. Functional, and focus management handles it, but a collapse for older turns was deliberately left out of scope. |

## Hosting options for later

**Nothing is deployed, published, or hosted.** There is no GitHub Pages workflow,
no Netlify, Cloudflare, or Azure configuration, no custom domain, and no public
URL. Review happens by running the build locally.

| Option | Best for | Notes |
| --- | --- | --- |
| Local static build (`npm run preview`) | Review and demos today | No account, no hosting, nothing exposed |
| Single-file HTML build | Passing it to a colleague | Would need `vite-plugin-singlefile`; not added. A self-contained file could live on internal SharePoint, Teams, or OneDrive |
| GitHub Pages | Simplest public URL | Free, one workflow — but **public by default**, so unsuitable while content is under review |
| Netlify / Cloudflare Pages | A URL with preview builds | Free tier; access protection generally needs a paid plan |
| Azure Static Web Apps | A Microsoft-centred environment | Integrates with Entra ID if access control is ever wanted |
| Internal web server | Internal-only access | Needs IT involvement and a named owner for patching |

### Prerequisites before any hosting decision

1. Decide the audience: internal only, or beyond the organisation.
2. Decide whether access control is needed. This prototype has no authentication,
   so a hosted copy is readable by anyone who has the link.
3. Name an owner for the deployment, its updates, and its eventual retirement.
4. Replace the provisional colours with confirmed brand values.
5. Confirm all content is still fictional, or has been reviewed and approved.
6. Keep the prototype disclaimers visible on any hosted copy.

## If this becomes a real project

The report answers this for whatever project it assesses, but for this tool
itself: a production version would need persistent storage, authentication,
role-based permissions, backups with a tested restore, audit history, monitoring,
a recovery plan, and a named maintenance owner. None of those exists here, and a
frontend-only prototype cannot provide them.
