# Hosting options for later

**Nothing in this repository is deployed, published, or hosted.** No GitHub Pages
workflow, Netlify, Cloudflare, or Azure configuration exists, and no custom domain
or public URL is set up. This document records options to weigh *after* the
prototype has been reviewed and approved.

For the current phase, review happens by running the dev server or opening the
static build locally.

| Option | Best for | Notes |
| --- | --- | --- |
| Local static build (`dist/`) | Review right now | Served locally with `npm run preview`; relative base path already configured. No account, no hosting |
| Single-file HTML build (Phase 5) | Passing the prototype to a colleague | One self-contained file that opens straight from the file system; can live on internal storage such as SharePoint, Teams, or OneDrive |
| GitHub Pages | Simplest public URL | Free; **public by default** — unsuitable while content is under review |
| Netlify / Cloudflare Pages | Public URL with preview builds | Free tier; access protection generally needs a paid plan |
| Azure Static Web Apps | A Microsoft-centred environment | Integrates with Entra ID if access control is ever wanted |
| Internal web server | Internal-only access | Requires IT involvement and an owner for patching |

## Questions to settle before any hosting decision

1. Who is the intended audience — internal team only, or people outside the organisation?
2. Does the hosted version need access control? (This prototype has no authentication.)
3. Who owns the deployment, updates, and eventual retirement?
4. Does anything in the hosted content need review before it leaves internal storage?
5. Is a static host sufficient, or has the project by then grown to need a backend?

## Prerequisites regardless of option

- All sample content remains fictional, or real content is reviewed and approved.
- Provisional colours are replaced with confirmed brand values.
- Prototype disclaimers stay visible on the hosted version.
- A named owner accepts responsibility for the hosted page.
