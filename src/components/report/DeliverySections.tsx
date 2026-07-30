import { useState } from 'react';

import { DataLabel } from '@/components/DataLabel';
import { RoadmapChart } from '@/components/report/charts';
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
import type { ProvenanceLabel } from '@/types/labels';

/* MVP recommendation, phased roadmap, and the evidence panels. */

export function MvpSection({ assessment }: { assessment: Assessment }) {
  const { mvp } = assessment;

  return (
    <ReportSection
      id="mvp"
      intro={
        <p>
          The smallest version worth building, drawn from the must-have list you gave and
          the capabilities the recommended route provides.
        </p>
      }
      title="MVP recommendation"
    >
      <FactList
        columns={1}
        items={[
          { term: 'Main problem solved', value: mvp.mainProblemSolved, provenance: 'from-your-answer' },
          { term: 'Test period', value: mvp.testPeriod, provenance: 'estimate' },
        ]}
      />

      <div className="mvp-grid">
        <BulletList
          heading="Included features"
          headingLevel={3}
          items={mvp.includedFeatures}
          tone="positive"
        />
        <BulletList
          heading="Excluded from the first version"
          headingLevel={3}
          items={mvp.excludedFeatures}
          tone="muted"
        />
        <BulletList heading="Required tools" headingLevel={3} items={mvp.requiredTools} />
        <BulletList heading="Required users" headingLevel={3} items={mvp.requiredUsers} />
        <BulletList
          heading="Human-review requirements"
          headingLevel={3}
          items={mvp.humanReviewRequirements}
        />
        <BulletList
          heading="Success measures"
          headingLevel={3}
          items={mvp.successMeasures}
          tone="positive"
        />
        <BulletList
          heading="Failure criteria"
          headingLevel={3}
          items={mvp.failureCriteria}
          tone="negative"
        />
        <BulletList
          heading="Conditions for expansion"
          headingLevel={3}
          items={mvp.expansionConditions}
        />
        <BulletList heading="Stays manual for now" headingLevel={3} items={mvp.remainManual} />
        <BulletList
          heading="Should not be automated yet"
          headingLevel={3}
          items={mvp.doNotAutomateYet}
          tone="negative"
        />
      </div>
      <p className="table-note">
        Every item above is <DataLabel compact label="derived" /> from your answers, or{' '}
        <DataLabel compact label="estimate" /> where a duration is involved.
      </p>
    </ReportSection>
  );
}

export function RoadmapSection({ assessment }: { assessment: Assessment }) {
  const { roadmap } = assessment;

  return (
    <ReportSection
      id="roadmap"
      intro={
        <p>
          Five phases, each with a goal and an exit criterion so it is clear when to move
          on. Durations come from the timeline estimate.
        </p>
      }
      title="Phased roadmap"
    >
      <RoadmapChart phases={roadmap} />

      <div className="roadmap">
        {roadmap.map((phase) => (
          <article className="roadmap__phase" key={phase.id}>
            <div className="roadmap__head">
              <h3 className="roadmap__title">{phase.label}</h3>
              <span className="roadmap__time">
                {phase.estimatedTime} <DataLabel compact label={phase.provenance} />
              </span>
            </div>
            <p className="roadmap__goal">
              <strong>Goal:</strong> {phase.goal}
            </p>
            <dl className="roadmap__meta">
              <div>
                <dt>Required owner</dt>
                <dd>{phase.requiredOwner}</dd>
              </div>
              <div>
                <dt>Maturity reached</dt>
                <dd>
                  {MATURITY_LABELS[phase.maturityReached]}{' '}
                  {phase.achievableWithRecommendedRoute ? (
                    <StatusPill text="Reachable with the recommended route" tone="positive" />
                  ) : (
                    <StatusPill text="Needs a different route" tone="caution" />
                  )}
                </dd>
              </div>
              <div>
                <dt>Main risk</dt>
                <dd>{phase.mainRisk}</dd>
              </div>
            </dl>
            <BulletList heading="Main work" items={phase.mainWork} />
            <BulletList heading="Exit criteria" items={phase.exitCriteria} tone="positive" />
          </article>
        ))}
      </div>
    </ReportSection>
  );
}

type PanelId =
  | 'from-your-answers'
  | 'derived'
  | 'estimates'
  | 'assumptions'
  | 'demonstration-data'
  | 'unknowns'
  | 'verification';

interface PanelMeta {
  readonly id: PanelId;
  readonly label: string;
  readonly provenance: ProvenanceLabel;
}

const PANELS: readonly PanelMeta[] = [
  { id: 'from-your-answers', label: 'From your answers', provenance: 'from-your-answer' },
  { id: 'derived', label: 'Derived findings', provenance: 'derived' },
  { id: 'estimates', label: 'Estimates', provenance: 'estimate' },
  { id: 'assumptions', label: 'Assumptions', provenance: 'assumption' },
  { id: 'demonstration-data', label: 'Demonstration data', provenance: 'demonstration-data' },
  { id: 'unknowns', label: 'Unknowns', provenance: 'unknown' },
  { id: 'verification', label: 'Requires verification', provenance: 'requires-verification' },
];

export function EvidenceSection({ assessment }: { assessment: Assessment }) {
  const { evidencePanels, confidence } = assessment;
  const [active, setActive] = useState<PanelId>('from-your-answers');

  const counts: Record<PanelId, number> = {
    'from-your-answers': evidencePanels.fromYourAnswers.length,
    derived: evidencePanels.derivedFindings.length,
    estimates: evidencePanels.estimates.length,
    assumptions: evidencePanels.assumptions.length,
    'demonstration-data': evidencePanels.demonstrationData.length,
    unknowns: evidencePanels.unknowns.length,
    verification: evidencePanels.verificationNeeds.length,
  };

  return (
    <ReportSection
      id="evidence"
      intro={
        <p>
          Everything the assessment used, separated by what kind of statement it is.
          Assessment confidence is {confidence.score} of 100 ({confidence.band}).
        </p>
      }
      title="Evidence, assumptions, unknowns, and verification needs"
    >
      <div className="tabs" role="tablist">
        {PANELS.map((panel) => (
          <button
            aria-controls={`panel-${panel.id}`}
            aria-selected={active === panel.id}
            className="tabs__tab"
            id={`tab-${panel.id}`}
            key={panel.id}
            onClick={() => setActive(panel.id)}
            role="tab"
            type="button"
          >
            {panel.label} ({counts[panel.id]})
          </button>
        ))}
      </div>

      {PANELS.map((panel) => (
        <div
          aria-labelledby={`tab-${panel.id}`}
          className="tabs__panel"
          hidden={active !== panel.id}
          id={`panel-${panel.id}`}
          key={panel.id}
          role="tabpanel"
          tabIndex={0}
        >
          <p className="tabs__panel-label">
            <DataLabel label={panel.provenance} />
          </p>

          {panel.id === 'unknowns' ? (
            evidencePanels.unknowns.length === 0 ? (
              <p>Nothing was left unknown.</p>
            ) : (
              <ScrollTable
                caption="Each unknown, why it matters, what it affects, and what would improve confidence"
                label="Unknowns table"
              >
                <thead>
                  <tr>
                    <th scope="col">Missing information</th>
                    <th scope="col">Why it matters</th>
                    <th scope="col">Which result it affects</th>
                    <th scope="col">What would improve confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {evidencePanels.unknowns.map((unknown) => (
                    <tr key={unknown.field}>
                      <th scope="row">{unknown.field}</th>
                      <td>{unknown.whyItMatters}</td>
                      <td>{unknown.affects}</td>
                      <td>{unknown.wouldImprove}</td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            )
          ) : panel.id === 'verification' ? (
            <>
              <Callout title="Not yet researched" tone="warning">
                <p className="no-margin">{evidencePanels.notResearchedStatement}</p>
              </Callout>
              <ScrollTable
                caption="What must be verified with a real source before implementation"
                label="Verification needs table"
              >
                <thead>
                  <tr>
                    <th scope="col">Category</th>
                    <th scope="col">What to verify</th>
                  </tr>
                </thead>
                <tbody>
                  {evidencePanels.verificationNeeds.map((need) => (
                    <tr key={need.category}>
                      <th scope="row">{need.category}</th>
                      <td>{need.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </ScrollTable>
            </>
          ) : (
            <BulletList
              items={
                panel.id === 'from-your-answers'
                  ? evidencePanels.fromYourAnswers
                  : panel.id === 'derived'
                    ? evidencePanels.derivedFindings
                    : panel.id === 'estimates'
                      ? evidencePanels.estimates
                      : panel.id === 'assumptions'
                        ? evidencePanels.assumptions
                        : evidencePanels.demonstrationData.length > 0
                          ? evidencePanels.demonstrationData
                          : ['No demonstration data was used: every answer came from you.']
              }
            />
          )}
        </div>
      ))}
    </ReportSection>
  );
}
