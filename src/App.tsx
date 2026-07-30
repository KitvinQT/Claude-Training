import { AppFooter } from '@/components/AppFooter';
import { AppHeader } from '@/components/AppHeader';
import { PrototypeBanner } from '@/components/PrototypeBanner';
import { ProvenanceLegend } from '@/components/ProvenanceLegend';
import {
  FUTURE_FEATURES,
  PROTOTYPE_LIMITS,
  PROTOTYPE_NAME,
} from '@/content/disclaimers';

/**
 * Application shell.
 *
 * Phase 0 renders the shell, the disclaimer surfaces, and the provenance
 * labelling system only. The welcome screen, grouped chat intake, review screen,
 * and report are added in later phases and will be mounted inside <main>.
 */
export function App() {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <PrototypeBanner />
      <AppHeader />

      <main className="app-main" id="main" tabIndex={-1}>
        <div className="container stack">
          <h1>{PROTOTYPE_NAME}</h1>
          <p className="lede">
            This tool asks about a project idea, then produces two separate
            headline assessments: how feasible the <strong>project</strong> is,
            and how good a fit it is for the <strong>current builder</strong>. A
            project can be entirely feasible while still needing guidance,
            technical support, or a developer to build it - the two scores are
            never mixed together.
          </p>

          <section aria-labelledby="limits-heading" className="card">
            <h2 className="card__title" id="limits-heading">
              What this first version does and does not do
            </h2>
            <ul>
              {PROTOTYPE_LIMITS.map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
            </ul>
            <h3>Possible future features (not included here)</h3>
            <ul className="text-muted">
              {FUTURE_FEATURES.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="legend-heading" className="card">
            <h2 className="card__title" id="legend-heading">
              How values are labelled
            </h2>
            <p>
              Every number and statement in the assessment carries one of these
              labels, so nothing in the report can be mistaken for a confirmed
              fact or a vendor quote.
            </p>
            <ProvenanceLegend />
          </section>

          <section aria-labelledby="build-heading" className="card card--alt">
            <h2 className="card__title" id="build-heading">
              Build status
            </h2>
            <p className="no-margin">
              Phase 0 complete: repository scaffold, design tokens, application
              shell, disclaimer surfaces, provenance labelling, and test
              configuration. The welcome screen and grouped chat intake arrive in
              Phase 1.
            </p>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
