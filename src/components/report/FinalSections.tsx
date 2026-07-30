import { DataLabel } from '@/components/DataLabel';
import {
  BulletList,
  Callout,
  FactList,
  ReportSection,
  ScrollTable,
  StatusPill,
} from '@/components/report/primitives';
import type { Assessment } from '@/engine/types';
import { MATURITY_LABELS } from '@/engine/types';

/* Final recommendation and immediate next actions. */

export function FinalRecommendationSection({ assessment }: { assessment: Assessment }) {
  const final = assessment.finalRecommendation;

  return (
    <ReportSection
      id="final-recommendation"
      intro={
        <p>
          One verdict, restated from the verdict engine. Nothing elsewhere in this report
          contradicts it.
        </p>
      }
      title="Final implementation recommendation"
      tone="accent"
    >
      <div className="final__verdict">
        <p className="final__eyebrow">Final verdict</p>
        <p className="final__value">
          <StatusPill
            text={final.verdictLabel}
            tone={
              final.verdict === 'proceed'
                ? 'strong'
                : final.verdict === 'no-go'
                  ? 'critical'
                  : final.verdict === 'do-not-build-yet'
                    ? 'weak'
                    : 'adequate'
            }
          />
        </p>
        <p className="final__reason">
          <strong>Main reason:</strong> {final.mainReason}
        </p>
        <DataLabel label="derived" />
      </div>

      <FactList
        items={[
          {
            term: 'Project Feasibility Score',
            value: `${final.projectFeasibilityScore} of 100`,
            provenance: 'derived',
          },
          {
            term: 'Builder Fit Score',
            value: `${final.builderFitScore} of 100 (for the practical route)`,
            provenance: 'derived',
          },
          {
            term: 'Assessment confidence',
            value: `${final.confidenceScore} of 100 (${final.confidenceBand})`,
            provenance: 'derived',
          },
          {
            term: 'Best technical route',
            value: final.bestTechnicalRouteName,
            provenance: 'derived',
          },
          {
            term: 'Recommended practical path',
            value: final.practicalPathHeadline,
            provenance: 'derived',
          },
          {
            term: 'Best alternative',
            value: final.alternativeRouteName ?? 'None identified.',
            provenance: 'derived',
          },
          {
            term: 'Recommended implementation level',
            value: final.recommendedImplementationLevel,
            provenance: 'derived',
          },
          {
            term: 'Recommended maturity',
            value: MATURITY_LABELS[final.recommendedMaturity],
            provenance: 'derived',
          },
          { term: 'Hosting needed', value: final.hostingNeeded, provenance: 'derived' },
          { term: 'Database needed', value: final.databaseNeeded, provenance: 'derived' },
          {
            term: 'Authentication needed',
            value: final.authenticationNeeded,
            provenance: 'derived',
          },
          {
            term: 'Developer support needed',
            value: final.developerSupportNeeded,
            provenance: 'derived',
          },
          {
            term: 'Maintenance difficulty',
            value: final.maintenanceDifficulty,
            provenance: 'derived',
          },
        ]}
      />

      <div className="final__grid">
        <BulletList heading="Required tools" headingLevel={3} items={final.requiredTools} />
        <BulletList
          heading="Optional tools"
          headingLevel={3}
          items={final.optionalTools}
          tone="muted"
        />
        <BulletList
          heading="What not to build yet"
          headingLevel={3}
          items={final.whatNotToBuildYet}
          tone="negative"
        />
      </div>

      <h3 className="final__subhead">Tools inappropriate under current conditions</h3>
      <ScrollTable
        caption="Routes that should not be used under current conditions, and why"
        label="Inappropriate tools table"
      >
        <thead>
          <tr>
            <th scope="col">Route or tool</th>
            <th scope="col">Reason</th>
          </tr>
        </thead>
        <tbody>
          {final.inappropriateTools.map((tool) => (
            <tr key={`${tool.name}-${tool.reason.slice(0, 20)}`}>
              <th scope="row">{tool.name}</th>
              <td>{tool.reason}</td>
            </tr>
          ))}
        </tbody>
      </ScrollTable>

      <div className="final__grid">
        <BulletList
          heading="Required conditions"
          items={
            final.requiredConditions.length > 0
              ? final.requiredConditions
              : ['None beyond the ordinary care described above.']
          }
        />
        <BulletList
          heading="Conditions that could change this recommendation"
          items={final.conditionsThatCouldChange}
          tone="muted"
        />
      </div>
    </ReportSection>
  );
}

export function NextActionsSection({ assessment }: { assessment: Assessment }) {
  const actions = assessment.finalRecommendation.immediateNextActions;

  return (
    <ReportSection
      id="next-actions"
      intro={<p>The first three things to do, in order.</p>}
      title="Immediate next actions"
    >
      <ol className="actions">
        {actions.map((action, index) => (
          <li className="actions__item" key={action}>
            <span className="actions__number" aria-hidden="true">
              {index + 1}
            </span>
            <span className="actions__text">{action}</span>
          </li>
        ))}
      </ol>
      <p className="table-note">
        <DataLabel compact label="derived" /> from the verdict and the weakest dimensions.
      </p>
      <Callout title="Before acting on any of this" tone="warning">
        <p className="no-margin">
          This is an illustrative assessment from a prototype. Its rubric is hand-written
          and unvalidated, its figures are estimates rather than quotations, and its results
          require human review. It must not be used to make final legal, financial, hiring,
          security, or implementation decisions.
        </p>
      </Callout>
    </ReportSection>
  );
}
