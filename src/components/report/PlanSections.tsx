import { DataLabel } from '@/components/DataLabel';
import {
  BulletList,
  Callout,
  Disclosure,
  FactList,
  ReportSection,
  ScrollTable,
  StatusPill,
} from '@/components/report/primitives';
import type { Assessment } from '@/engine/types';
import { MATURITY_LABELS, MATURITY_ORDER } from '@/engine/types';

/* Maturity, source of truth, and human safeguards. */

export function MaturitySection({ assessment }: { assessment: Assessment }) {
  const { maturity, routes, safeguards } = assessment;

  return (
    <ReportSection
      id="maturity"
      intro={
        <p>
          What level of system the project actually requires, and how far each route can
          take it. A frontend-only prototype is never production-ready.
        </p>
      }
      title="Maturity and production readiness"
    >
      <FactList
        items={[
          {
            term: 'Current prototype maturity',
            value:
              'Interactive prototype. This assessment tool itself holds nothing, identifies nobody, and enforces no permissions.',
            provenance: 'derived',
          },
          {
            term: 'Recommended next maturity',
            value: MATURITY_LABELS[maturity.recommendedStartingLevel],
            provenance: 'derived',
          },
          {
            term: 'Maturity the project requires',
            value: `${MATURITY_LABELS[maturity.requiredLevel]} — ${maturity.requiredLevelReasons.join(' ')}`,
            provenance: 'derived',
          },
        ]}
      />

      <Callout title="What a frontend-only prototype cannot provide" tone="warning">
        <ul className="callout__list">
          {safeguards.productionRequirementsUnmetByPrototype.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="no-margin">{maturity.prototypeStatement}</p>
      </Callout>

      <ScrollTable
        caption="Maximum supported maturity level for each route"
        label="Route maturity table"
      >
        <thead>
          <tr>
            <th scope="col">Route</th>
            {MATURITY_ORDER.map((level) => (
              <th key={level} scope="col">
                {MATURITY_LABELS[level]}
              </th>
            ))}
            <th scope="col">Ceiling</th>
          </tr>
        </thead>
        <tbody>
          {maturity.byRoute.map((item) => {
            const route = routes.find((candidate) => candidate.routeId === item.routeId)!;
            return (
              <tr key={item.routeId}>
                <th scope="row">{route.name}</th>
                {MATURITY_ORDER.map((level) => (
                  <td key={level}>
                    {item.supported.includes(level) ? (
                      <StatusPill text="Supported" tone="positive" />
                    ) : (
                      <StatusPill text="Not supported" tone="neutral" />
                    )}
                  </td>
                ))}
                <td>{MATURITY_LABELS[item.ceiling]}</td>
              </tr>
            );
          })}
        </tbody>
      </ScrollTable>

      <h3 className="plan__subhead">Missing requirements for production</h3>
      <p>
        A route counts as production-ready only when all ten of these are actually in
        place. None of them is optional.
      </p>
      <BulletList items={maturity.productionRequirements} />

      <Disclosure summary="Production blockers by route">
        {maturity.byRoute.map((item) => {
          const route = routes.find((candidate) => candidate.routeId === item.routeId)!;
          return (
            <div className="plan__route-notes" key={item.routeId}>
              <h4>{route.name}</h4>
              <BulletList items={item.notes} tone="muted" />
              <BulletList
                heading="Production blockers"
                items={item.productionBlockers.length > 0 ? item.productionBlockers : ['None identified.']}
                tone="negative"
              />
            </div>
          );
        })}
      </Disclosure>
    </ReportSection>
  );
}

export function SourceOfTruthSection({ assessment }: { assessment: Assessment }) {
  const { sourceOfTruth } = assessment;

  return (
    <ReportSection
      id="source-of-truth"
      intro={
        <p>
          Which copy of the information wins when two disagree, and what must not be
          changed or inferred.
        </p>
      }
      title="Source of truth"
    >
      {/* Deliberately outside any disclosure: this warning must not be hidden. */}
      {sourceOfTruth.statement !== null && (
        <Callout title={sourceOfTruth.statement} tone="critical">
          <p className="no-margin">
            No authoritative source has been agreed. Until one is, two copies of the same
            information will disagree and nobody will be able to say which is correct. This
            tool does not choose one on your behalf.
          </p>
        </Callout>
      )}

      <FactList
        items={[
          {
            term: 'Authoritative source',
            value: sourceOfTruth.authoritativeSource,
            provenance: sourceOfTruth.authoritativeSourceDefined ? 'from-your-answer' : 'unknown',
          },
          {
            term: 'Approval owner',
            value: sourceOfTruth.approvalOwner,
            provenance: 'derived',
          },
          {
            term: 'Backup requirement',
            value: sourceOfTruth.backupRequirement,
            provenance: 'derived',
          },
          {
            term: 'Audit-history requirement',
            value: sourceOfTruth.auditHistoryRequirement,
            provenance: 'derived',
          },
          {
            term: 'Recovery requirement',
            value: sourceOfTruth.recoveryRequirement,
            provenance: 'derived',
          },
        ]}
      />

      <div className="sot-grid">
        <BulletList
          heading="Secondary sources"
          headingLevel={3}
          items={sourceOfTruth.secondarySources}
          tone="muted"
        />
        <BulletList
          heading="Should remain read-only"
          headingLevel={3}
          items={sourceOfTruth.readOnlyInformation}
        />
        <BulletList
          heading="May be edited"
          headingLevel={3}
          items={sourceOfTruth.editableInformation}
        />
        <BulletList
          heading="Requires human confirmation"
          headingLevel={3}
          items={sourceOfTruth.requiresHumanConfirmation}
        />
        <BulletList
          heading="Must never be inferred"
          headingLevel={3}
          items={sourceOfTruth.mustNeverBeInferred}
          tone="negative"
        />
      </div>
    </ReportSection>
  );
}

export function SafeguardsSection({ assessment }: { assessment: Assessment }) {
  const { safeguards } = assessment;
  const consequential = safeguards.consequentialDomain !== 'none';

  return (
    <ReportSection
      id="safeguards"
      intro={
        <p>
          {consequential
            ? `This project touches ${safeguards.consequentialDomain} decisions. The requirements below are mandatory conditions, not optional best practices.`
            : 'No consequential decision domain was identified. The general rules below still apply to anything used to make a decision.'}
        </p>
      }
      title="Human safeguards"
      tone="accent"
    >
      {consequential && (
        <Callout title="Human authority is retained" tone="critical">
          <p className="no-margin">
            A named person makes and owns every final {safeguards.consequentialDomain}{' '}
            decision. The system may organise, summarise, compare, and draft. It may not
            decide, and it may not act on a decision by itself.
          </p>
        </Callout>
      )}

      <div className="safeguards__grid">
        <div className="safeguards__panel safeguards__panel--may">
          <h3>AI may</h3>
          <ul>
            {safeguards.aiMayDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <DataLabel label="derived" />
        </div>
        <div className="safeguards__panel safeguards__panel--must-not">
          <h3>AI must not</h3>
          <ul>
            {safeguards.aiMustNotDo.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <DataLabel label="derived" />
        </div>
      </div>

      <h3 className="plan__subhead">Human-approval requirements</h3>
      {safeguards.humanApprovalRequirements.length === 0 ? (
        <p>None derived from the answers given.</p>
      ) : (
        <ScrollTable
          caption="Actions that require human approval, and who owns each one"
          label="Human approval requirements table"
        >
          <thead>
            <tr>
              <th scope="col">Action</th>
              <th scope="col">Requirement</th>
              <th scope="col">Accountable owner</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {safeguards.humanApprovalRequirements.map((requirement) => (
              <tr key={`${requirement.action}-${requirement.owner}`}>
                <th scope="row">{requirement.action}</th>
                <td>{requirement.requirement}</td>
                <td>{requirement.owner}</td>
                <td>
                  <StatusPill text="Human approval required" tone="caution" />
                </td>
              </tr>
            ))}
          </tbody>
        </ScrollTable>
      )}

      <BulletList
        heading="Sensitive-data handling"
        items={safeguards.sensitiveDataHandling}
      />
      {safeguards.notes.length > 0 && <BulletList heading="Notes" items={safeguards.notes} />}
      <BulletList
        heading="Production requirements a frontend-only prototype cannot satisfy"
        items={safeguards.productionRequirementsUnmetByPrototype}
        tone="negative"
      />
    </ReportSection>
  );
}
