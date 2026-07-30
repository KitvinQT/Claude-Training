import { DataLabel } from '@/components/DataLabel';
import {
  BulletList,
  Callout,
  Disclosure,
  FactList,
  ReportSection,
  ScrollTable,
  StatusPill,
  type FactItem,
} from '@/components/report/primitives';
import { ROUTE_DELIVERY } from '@/data/routeDelivery';
import type { Assessment, RouteAssessment } from '@/engine/types';
import {
  COST_CATEGORY_LABELS,
  MATURITY_LABELS,
  SUITABILITY_LABELS,
  TECHNICAL_STATUS_LABELS,
} from '@/engine/types';

/* Technical route versus practical path, and the full route comparison. */

export function RoutePathsSection({ assessment }: { assessment: Assessment }) {
  const { routePlan } = assessment;
  const { bestTechnical, practical, alternative } = routePlan;

  const technicalFacts: readonly FactItem[] = [
    { term: 'Route', value: bestTechnical.name, provenance: 'derived' },
    { term: 'Build method', value: bestTechnical.buildMethod, provenance: 'derived' },
    { term: 'Final solution type', value: bestTechnical.finalSolutionType, provenance: 'derived' },
    { term: 'Hosting target', value: bestTechnical.hostingTarget, provenance: 'requires-verification' },
    { term: 'Builder requirement', value: bestTechnical.builderRequirement, provenance: 'derived' },
  ];

  return (
    <ReportSection
      id="route-paths"
      intro={<p>{routePlan.separationStatement}</p>}
      title="Technical route and practical path"
      tone="accent"
    >
      <div className="paths">
        <article className="paths__card">
          <p className="paths__eyebrow">A. Best technical route</p>
          <h3 className="paths__title">{bestTechnical.name}</h3>
          <p className="paths__label">
            <StatusPill
              text={routePlan.technicalRouteLabel}
              tone={
                routePlan.technicalRouteLabel.includes('not suitable for independent')
                  ? 'caution'
                  : 'positive'
              }
            />
          </p>
          <BulletList heading="Why it technically fits" items={bestTechnical.whyItFits} tone="positive" />
          <FactList columns={1} items={technicalFacts} />
          {bestTechnical.overlapNote !== null && (
            <Callout title="Method and destination are different questions">
              <p className="no-margin">{bestTechnical.overlapNote}</p>
            </Callout>
          )}
          <Disclosure summary="Required capabilities, security, and infrastructure">
            <BulletList heading="Required capabilities" items={bestTechnical.requiredCapabilities} />
            <BulletList
              heading="Required security and infrastructure"
              items={bestTechnical.requiredSecurityInfrastructure}
            />
          </Disclosure>
          <p className="paths__line">
            <strong>Builder support needed:</strong> {bestTechnical.builderSupportNeeded}{' '}
            <DataLabel compact label="derived" />
          </p>
          <p className="paths__line">
            <strong>Main limitation:</strong> {bestTechnical.mainLimitation}{' '}
            <DataLabel compact label="derived" />
          </p>
        </article>

        <article className="paths__card paths__card--practical">
          <p className="paths__eyebrow">B. Recommended practical path</p>
          <h3 className="paths__title">{practical.headline}</h3>
          <p className="paths__label">
            <StatusPill
              text={
                practical.canBuilderPerformIt
                  ? 'The current builder can perform this'
                  : 'Not suitable for independent implementation'
              }
              tone={practical.canBuilderPerformIt ? 'positive' : 'caution'}
            />
          </p>
          <BulletList heading="What to do now" items={practical.whatToDoNow} />
          <p className="paths__line">
            <strong>Can the current builder perform it?</strong> {practical.builderStatement}{' '}
            <DataLabel compact label="derived" />
          </p>
          <p className="paths__line">
            <strong>Support needed:</strong> {practical.supportNeeded}{' '}
            <DataLabel compact label="derived" />
          </p>
          <p className="paths__line">
            <strong>Interim route:</strong>{' '}
            {practical.interimRouteName === null
              ? 'None recommended.'
              : `${practical.interimRouteName}. ${practical.interimRationale ?? ''}`}{' '}
            <DataLabel compact label="derived" />
          </p>
          <Callout title="Immediate validation step">
            <p className="no-margin">{practical.immediateValidationStep}</p>
          </Callout>
        </article>

        <article className="paths__card">
          <p className="paths__eyebrow">C. Best alternative</p>
          {alternative === null ? (
            <p>No further realistic alternative was identified.</p>
          ) : (
            <>
              <h3 className="paths__title">{alternative.name}</h3>
              <BulletList
                heading="Why it is safer, simpler, or easier"
                items={alternative.whyEasier}
                tone="positive"
              />
              <BulletList
                heading="What capability is lost"
                items={alternative.capabilityLost}
                tone="negative"
              />
              <p className="paths__line">
                <strong>When to choose it instead:</strong> {alternative.chooseWhen}{' '}
                <DataLabel compact label="derived" />
              </p>
            </>
          )}
        </article>
      </div>
    </ReportSection>
  );
}

type RouteRole = 'technical' | 'practical' | 'alternative' | 'excluded' | 'blocked' | 'available';

function roleOf(route: RouteAssessment, assessment: Assessment): RouteRole {
  const { routePlan } = assessment;
  if (route.technicalStatus === 'technically-blocked') return 'blocked';
  if (route.excluded !== null) return 'excluded';
  if (route.routeId === routePlan.bestTechnical.routeId) return 'technical';
  if (route.routeId === routePlan.practical.routeId) return 'practical';
  if (route.routeId === routePlan.alternative?.routeId) return 'alternative';
  return 'available';
}

const ROLE_LABELS: Record<RouteRole, string> = {
  technical: 'Best technical route',
  practical: 'Recommended practical route',
  alternative: 'Best alternative',
  excluded: 'Excluded',
  blocked: 'Technically blocked',
  available: 'Available',
};

const ROLE_TONES: Record<RouteRole, 'positive' | 'adequate' | 'neutral' | 'caution' | 'blocked'> = {
  technical: 'positive',
  practical: 'positive',
  alternative: 'adequate',
  excluded: 'caution',
  blocked: 'blocked',
  available: 'neutral',
};

export function RouteComparisonSection({ assessment }: { assessment: Assessment }) {
  const { routes } = assessment;

  return (
    <ReportSection
      id="route-comparison"
      intro={
        <p>
          All eight routes, including those ruled out. A route excluded by one of your
          restrictions keeps its technical status: exclusion is a stated constraint, not a
          technical judgement.
        </p>
      }
      title="Implementation route comparison"
    >
      <ScrollTable
        caption="Every implementation route with its eligibility, technical status, fit, cost, and blockers"
        label="Implementation route comparison table"
      >
        <thead>
          <tr>
            <th scope="col">Route</th>
            <th scope="col">Role</th>
            <th scope="col">Eligibility</th>
            <th scope="col">Technical status</th>
            <th scope="col">Route fit</th>
            <th scope="col">Builder Fit</th>
            <th scope="col">Suitability</th>
            <th scope="col">Maturity ceiling</th>
            <th scope="col">Estimated effort</th>
            <th scope="col">Setup cost</th>
            <th scope="col">Monthly cost</th>
            <th scope="col">Maintenance</th>
            <th scope="col">Vendor dependency</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((route) => {
            const role = roleOf(route, assessment);
            return (
              <tr className={`route-row route-row--${role}`} key={route.routeId}>
                <th scope="row">{route.name}</th>
                <td>
                  <StatusPill text={ROLE_LABELS[role]} tone={ROLE_TONES[role]} />
                </td>
                <td>
                  {route.eligibleForRecommendation
                    ? 'Available'
                    : route.excluded
                      ? 'Excluded'
                      : 'Not available'}
                </td>
                <td>{TECHNICAL_STATUS_LABELS[route.technicalStatus]}</td>
                <td>{route.fitScore} of 100</td>
                <td>{route.builderFit.score} of 100</td>
                <td>{SUITABILITY_LABELS[route.suitability]}</td>
                <td>{MATURITY_LABELS[route.maturityCeiling]}</td>
                <td>
                  {route.effort.lowHours}–{route.effort.highHours} h
                </td>
                <td>{COST_CATEGORY_LABELS[route.setupCost]}</td>
                <td>{COST_CATEGORY_LABELS[route.monthlyCost]}</td>
                <td>{route.maintenanceLevel}</td>
                <td>{route.vendorDependency}</td>
              </tr>
            );
          })}
        </tbody>
      </ScrollTable>
      <p className="table-note">
        Route fit, Builder Fit, and effort are <DataLabel compact label="derived" /> or{' '}
        <DataLabel compact label="estimate" />. Cost categories are{' '}
        <DataLabel compact label="requires-verification" />.
      </p>

      <div className="route-cards">
        {routes.map((route) => {
          const role = roleOf(route, assessment);
          const delivery = ROUTE_DELIVERY[route.routeId];
          return (
            <article className={`route-card route-card--${role}`} key={route.routeId}>
              <div className="route-card__head">
                <h3 className="route-card__title">{route.name}</h3>
                <StatusPill text={ROLE_LABELS[role]} tone={ROLE_TONES[role]} />
              </div>
              <p className="route-card__summary">{route.summary}</p>

              {route.excluded !== null && (
                <Callout title={`Excluded: ${route.excluded.type.replace(/-/g, ' ')}`} tone="warning">
                  <p className="no-margin">{route.excluded.reason}</p>
                  <p className="no-margin text-sm">
                    Technical status is unchanged:{' '}
                    <strong>{TECHNICAL_STATUS_LABELS[route.technicalStatus]}</strong>.
                  </p>
                </Callout>
              )}

              {delivery.overlapNote !== null && (
                <p className="route-card__overlap">
                  <strong>Method and destination:</strong> {delivery.overlapNote}
                </p>
              )}

              <Disclosure summary={`Full profile for ${route.name}`}>
                <FactList
                  columns={1}
                  items={[
                    { term: 'Build method', value: delivery.buildMethod, provenance: 'derived' },
                    { term: 'Final solution type', value: delivery.finalSolutionType, provenance: 'derived' },
                    { term: 'Required skills', value: route.requiredSkills.join('; '), provenance: 'derived' },
                    { term: 'Required support', value: route.requiredTechnicalSupport, provenance: 'derived' },
                    { term: 'Hosting requirement', value: route.requiredHosting, provenance: 'derived' },
                    { term: 'Database requirement', value: route.requiredDatabase, provenance: 'derived' },
                    {
                      term: 'Authentication requirement',
                      value: route.authenticationRequirements,
                      provenance: 'derived',
                    },
                    { term: 'Scalability', value: route.scalability, provenance: 'derived' },
                  ]}
                />
                <BulletList heading="Security considerations" items={route.securityConsiderations} />
                <BulletList heading="Main strengths" items={route.strengths} tone="positive" />
                <BulletList heading="Main limitations" items={route.limitations} tone="negative" />
                <BulletList
                  heading="Blockers"
                  items={route.blockers.length > 0 ? route.blockers : ['None.']}
                  tone="negative"
                />
                <BulletList
                  heading="Conditions before selection"
                  items={route.conditionsBeforeSelection}
                />
                <BulletList
                  heading="How the route fit was calculated"
                  items={route.fitDrivers.map(
                    (driver) => `${driver.points > 0 ? '+' : ''}${driver.points} — ${driver.text}`,
                  )}
                  tone="muted"
                />
              </Disclosure>
            </article>
          );
        })}
      </div>
    </ReportSection>
  );
}
