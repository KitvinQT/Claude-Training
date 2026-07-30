import type { ReactNode } from 'react';

import { DataLabel } from '@/components/DataLabel';
import { Disclosure, ScrollTable } from '@/components/report/primitives';
import type {
  DimensionScore,
  Risk,
  RoadmapPhase,
  RouteAssessment,
} from '@/engine/types';
import {
  DIMENSION_STATUS_LABELS,
  DURATION_BAND_ORDER,
  MATURITY_LABELS,
  SUITABILITY_LABELS,
} from '@/engine/types';
import type { ProvenanceLabel } from '@/types/labels';

/* ------------------------------------------------------------------ *
 * Four figures, each driven entirely by values the engine already
 * calculated. Nothing here invents a number, interpolates a trend, or adds a
 * decorative series.
 *
 * Built from CSS bars rather than a charting library: the shapes needed are
 * simple, it adds no dependency, and it keeps full control of the accessible
 * markup. Each figure is a role="img" with a text description, and every one
 * carries a table alternative holding the same values.
 *
 * Bars have a short width transition, which the reduced-motion rule in
 * report.css removes entirely.
 * ------------------------------------------------------------------ */

function ChartFigure({
  title,
  description,
  provenance,
  children,
  tableLabel,
  table,
}: {
  title: string;
  description: string;
  provenance: ProvenanceLabel;
  children: ReactNode;
  tableLabel: string;
  table: ReactNode;
}) {
  return (
    <figure className="chart">
      <figcaption className="chart__caption">
        <span className="chart__title">{title}</span> <DataLabel compact label={provenance} />
      </figcaption>
      {/* The values are stated in the table below; the graphic is one image. */}
      <div aria-label={description} className="chart__plot" role="img">
        {children}
      </div>
      <Disclosure summary={`View as table: ${tableLabel}`}>{table}</Disclosure>
    </figure>
  );
}

/* ---------------- 1. Project feasibility dimensions ---------------- */

export function DimensionChart({
  dimensions,
  overall,
}: {
  dimensions: readonly DimensionScore[];
  overall: number;
}) {
  const description = `Bar chart of the ten project feasibility dimensions, scored from 0 to 100. Overall project feasibility is ${overall} of 100. ${dimensions
    .map((dimension) => `${dimension.label} ${dimension.score}`)
    .join(', ')}.`;

  return (
    <ChartFigure
      description={description}
      provenance="derived"
      table={
        <ScrollTable
          caption="Every dimension with its score, weight, weighted contribution, and status"
          label="Project feasibility dimension values"
        >
          <thead>
            <tr>
              <th scope="col">Dimension</th>
              <th scope="col">Score of 100</th>
              <th scope="col">Weight</th>
              <th scope="col">Weighted contribution</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {dimensions.map((dimension) => (
              <tr key={dimension.id}>
                <th scope="row">{dimension.label}</th>
                <td>{dimension.score}</td>
                <td>{dimension.weight}%</td>
                <td>{dimension.weightedContribution}</td>
                <td>{DIMENSION_STATUS_LABELS[dimension.status]}</td>
              </tr>
            ))}
          </tbody>
        </ScrollTable>
      }
      tableLabel="dimension scores"
      title="Project feasibility by dimension"
    >
      <ul className="barchart">
        {dimensions.map((dimension) => (
          <li className="barchart__row" key={dimension.id}>
            <span className="barchart__label">{dimension.label}</span>
            <span className="barchart__track">
              <span
                className={`barchart__bar barchart__bar--${dimension.status}`}
                style={{ width: `${dimension.score}%` }}
              />
            </span>
            <span className="barchart__value">
              {dimension.score}
              <span className="barchart__unit"> / 100</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="barchart__footnote">
        Scale 0 to 100. Bar colour follows the status band; the status is also written in
        the table.
      </p>
    </ChartFigure>
  );
}

/* ---------------- 2. Route fit versus builder fit ---------------- */

export function FitComparisonChart({ routes }: { routes: readonly RouteAssessment[] }) {
  const description = `Paired bar chart comparing route fit and builder fit for all ${routes.length} routes, each scored from 0 to 100. ${routes
    .map(
      (route) =>
        `${route.name}: route fit ${route.fitScore}, builder fit ${route.builderFit.score}${route.excluded ? ', excluded' : ''}`,
    )
    .join('. ')}.`;

  return (
    <ChartFigure
      description={description}
      provenance="derived"
      table={
        <ScrollTable
          caption="Route fit and builder fit side by side, with eligibility"
          label="Route fit and builder fit values"
        >
          <thead>
            <tr>
              <th scope="col">Route</th>
              <th scope="col">Route fit of 100</th>
              <th scope="col">Builder Fit of 100</th>
              <th scope="col">Suitability</th>
              <th scope="col">Eligible</th>
            </tr>
          </thead>
          <tbody>
            {routes.map((route) => (
              <tr key={route.routeId}>
                <th scope="row">{route.name}</th>
                <td>{route.fitScore}</td>
                <td>{route.builderFit.score}</td>
                <td>{SUITABILITY_LABELS[route.suitability]}</td>
                <td>{route.eligibleForRecommendation ? 'Yes' : 'No — excluded'}</td>
              </tr>
            ))}
          </tbody>
        </ScrollTable>
      }
      tableLabel="route fit and builder fit"
      title="Route fit compared with Builder Fit"
    >
      <ul className="barchart barchart--paired">
        {routes.map((route) => (
          <li
            className={`barchart__row barchart__row--paired${route.excluded ? ' barchart__row--excluded' : ''}`}
            key={route.routeId}
          >
            <span className="barchart__label">
              {route.name}
              {route.excluded ? <span className="barchart__flag">Excluded</span> : null}
            </span>
            <span className="barchart__pair">
              <span className="barchart__track">
                <span
                  className="barchart__bar barchart__bar--route"
                  style={{ width: `${route.fitScore}%` }}
                />
              </span>
              <span className="barchart__track">
                <span
                  className="barchart__bar barchart__bar--builder"
                  style={{ width: `${route.builderFit.score}%` }}
                />
              </span>
            </span>
            <span className="barchart__value">
              {route.fitScore} / {route.builderFit.score}
            </span>
          </li>
        ))}
      </ul>
      <p className="barchart__footnote">
        <span className="legend-swatch legend-swatch--route" aria-hidden="true" /> Upper bar:
        route fit (how well the route matches the requirements).{' '}
        <span className="legend-swatch legend-swatch--builder" aria-hidden="true" /> Lower
        bar: Builder Fit (whether the current builder can deliver and maintain it). The two
        are independent, and a high route fit with a low Builder Fit is a normal result.
      </p>
    </ChartFigure>
  );
}

/* ---------------- 3. Risk severity ---------------- */

export function RiskSeverityChart({ risks }: { risks: readonly Risk[] }) {
  const description = `Severity chart for all ${risks.length} risk categories on the 1 to 5 scale. ${risks
    .map((risk) => `${risk.label} ${risk.score} of 5, ${risk.scoreLabel}`)
    .join('. ')}.`;

  return (
    <ChartFigure
      description={description}
      provenance="derived"
      table={
        <ScrollTable
          caption="Every risk category with its 1 to 5 score, written severity, and owner"
          label="Risk severity values"
        >
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Score of 5</th>
              <th scope="col">Severity</th>
              <th scope="col">Owner</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((risk) => (
              <tr key={risk.category}>
                <th scope="row">{risk.label}</th>
                <td>{risk.score}</td>
                <td>{risk.scoreLabel}</td>
                <td>{risk.owner}</td>
              </tr>
            ))}
          </tbody>
        </ScrollTable>
      }
      tableLabel="risk severity"
      title="Risk severity by category (1 to 5)"
    >
      <ul className="severity">
        {risks.map((risk) => (
          <li className="severity__row" key={risk.category}>
            <span className="severity__label">{risk.label}</span>
            <span className="severity__cells">
              {[1, 2, 3, 4, 5].map((step) => (
                <span
                  className={`severity__cell${step <= risk.score ? ` severity__cell--filled severity__cell--${risk.score}` : ''}`}
                  key={step}
                >
                  {step}
                </span>
              ))}
            </span>
            <span className="severity__value">
              {risk.score} of 5 — {risk.scoreLabel}
            </span>
          </li>
        ))}
      </ul>
      <p className="barchart__footnote">
        Scale: 1 very low, 2 low, 3 moderate, 4 high, 5 very high. This is a single severity
        value per category, not a likelihood-against-impact grid: the rubric does not
        calculate those two axes separately.
      </p>
    </ChartFigure>
  );
}

/* ---------------- 4. Phased roadmap ---------------- */

export function RoadmapChart({ phases }: { phases: readonly RoadmapPhase[] }) {
  const maxBand = DURATION_BAND_ORDER.length;
  const description = `Roadmap chart of the five phases with their estimated duration bands. ${phases
    .map((phase) => `${phase.label}, ${phase.estimatedTime}, reaching ${MATURITY_LABELS[phase.maturityReached]}`)
    .join('. ')}.`;

  return (
    <ChartFigure
      description={description}
      provenance="estimate"
      table={
        <ScrollTable
          caption="Each phase with its estimated duration band, maturity reached, and whether the recommended route can reach it"
          label="Roadmap phase values"
        >
          <thead>
            <tr>
              <th scope="col">Phase</th>
              <th scope="col">Estimated time</th>
              <th scope="col">Maturity reached</th>
              <th scope="col">Reachable with the recommended route</th>
            </tr>
          </thead>
          <tbody>
            {phases.map((phase) => (
              <tr key={phase.id}>
                <th scope="row">{phase.label}</th>
                <td>{phase.estimatedTime}</td>
                <td>{MATURITY_LABELS[phase.maturityReached]}</td>
                <td>{phase.achievableWithRecommendedRoute ? 'Yes' : 'No — needs a different route'}</td>
              </tr>
            ))}
          </tbody>
        </ScrollTable>
      }
      tableLabel="roadmap phases"
      title="Phased roadmap: estimated duration per phase"
    >
      <ul className="barchart barchart--roadmap">
        {phases.map((phase) => {
          // Bar length reflects the position of the duration band on the agreed
          // scale, not a precise number of days. The band text is always shown.
          const index = phase.band === null ? -1 : DURATION_BAND_ORDER.indexOf(phase.band);
          const width = index < 0 ? 0 : ((index + 1) / maxBand) * 100;
          return (
            <li className="barchart__row" key={phase.id}>
              <span className="barchart__label">{phase.label}</span>
              <span className="barchart__track">
                <span
                  className={`barchart__bar barchart__bar--phase${phase.achievableWithRecommendedRoute ? '' : ' barchart__bar--unreachable'}`}
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="barchart__value">{phase.estimatedTime}</span>
            </li>
          );
        })}
      </ul>
      <p className="barchart__footnote">
        Bar length shows where each estimate sits on the agreed duration scale, from
        &ldquo;30 minutes to 1 hour&rdquo; through to &ldquo;more than 3 months&rdquo;. It is
        not a calendar and not a Gantt chart: the band text is the estimate.
      </p>
    </ChartFigure>
  );
}
