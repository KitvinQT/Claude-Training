import { useEffect, useRef } from 'react';

import { useAnnouncer } from '@/components/Announcer';
import { MemoryNotice } from '@/components/MemoryNotice';
import { Callout } from '@/components/report/primitives';
import { ExecutiveSummary } from '@/components/report/ExecutiveSummary';
import { BuilderFitSection, FeasibilitySection } from '@/components/report/ScoreSections';
import { RouteComparisonSection, RoutePathsSection } from '@/components/report/RouteSections';
import { CostSection, RiskRegisterSection, TimelineSection } from '@/components/report/RiskCostSections';
import {
  MaturitySection,
  SafeguardsSection,
  SourceOfTruthSection,
} from '@/components/report/PlanSections';
import {
  EvidenceSection,
  MvpSection,
  RoadmapSection,
} from '@/components/report/DeliverySections';
import {
  FinalRecommendationSection,
  NextActionsSection,
} from '@/components/report/FinalSections';
import { ReportActions } from '@/components/report/ReportActions';
import { ReportNav } from '@/components/report/ReportNav';
import { PROTOTYPE_STATEMENTS } from '@/content/disclaimers';
import { useIntake } from '@/state/IntakeContext';

export function ReportScreen() {
  const { state } = useIntake();
  const { announce } = useAnnouncer();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const assessment = state.assessment;

  useEffect(() => {
    headingRef.current?.focus();
    announce('Assessment ready');
  }, [announce]);

  if (!assessment) {
    return (
      <div className="stack">
        <h1>No assessment available</h1>
        <p>Return to the review screen and generate an assessment.</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <h1 ref={headingRef} tabIndex={-1}>
        Feasibility assessment: {assessment.projectName}
      </h1>

      {/* 1. Prototype and human-review notice */}
      <Callout level={2} title="Prototype output — human review required" tone="warning">
        <ul className="callout__list">
          {PROTOTYPE_STATEMENTS.map((statement) => (
            <li key={statement}>{statement}</li>
          ))}
        </ul>
      </Callout>
      <MemoryNotice />

      {state.assessmentStale && (
        <Callout level={2} title="Answers changed since this assessment was produced" tone="warning">
          <p className="no-margin">
            You have edited the intake since this was generated. Choose “Regenerate
            assessment” to bring it up to date.
          </p>
        </Callout>
      )}

      <ReportActions position="top" />

      <div className="report-layout">
        <div className="report-layout__nav">
          <ReportNav />
        </div>
        <div className="report-layout__body">
          <ExecutiveSummary assessment={assessment} />
          <FeasibilitySection assessment={assessment} />
          <BuilderFitSection assessment={assessment} />
          <RoutePathsSection assessment={assessment} />
          <RouteComparisonSection assessment={assessment} />
          <RiskRegisterSection assessment={assessment} />
          <CostSection assessment={assessment} />
          <TimelineSection assessment={assessment} />
          <MaturitySection assessment={assessment} />
          <SourceOfTruthSection assessment={assessment} />
          <SafeguardsSection assessment={assessment} />
          <MvpSection assessment={assessment} />
          <RoadmapSection assessment={assessment} />
          <EvidenceSection assessment={assessment} />
          <FinalRecommendationSection assessment={assessment} />
          <NextActionsSection assessment={assessment} />
        </div>
      </div>

      <ReportActions position="bottom" />
    </div>
  );
}
