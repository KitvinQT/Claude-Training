import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  MaturityLevel,
  RoadmapPhase,
  RoadmapPhaseId,
  RouteAssessment,
  RoutePlan,
  TimelineEstimate,
} from '@/engine/types';
import { MATURITY_LABELS, MATURITY_ORDER } from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Phased roadmap: validation, prototype, MVP, controlled rollout, scale.
 *
 * Times come from the timeline estimate, so the roadmap and the timeline section
 * cannot disagree. No chart or Gantt visualisation - that is Phase 4.
 * ------------------------------------------------------------------ */

interface PhaseSeed {
  readonly id: RoadmapPhaseId;
  readonly label: string;
  readonly maturity: MaturityLevel;
  readonly timelinePhase: 'validation' | 'prototype' | 'mvp' | 'pilot' | 'production';
}

const SEEDS: readonly PhaseSeed[] = [
  { id: 'phase-0', label: 'Phase 0: Validation', maturity: 'concept', timelinePhase: 'validation' },
  {
    id: 'phase-1',
    label: 'Phase 1: Prototype',
    maturity: 'interactive-prototype',
    timelinePhase: 'prototype',
  },
  { id: 'phase-2', label: 'Phase 2: MVP', maturity: 'mvp', timelinePhase: 'mvp' },
  { id: 'phase-3', label: 'Phase 3: Controlled rollout', maturity: 'pilot', timelinePhase: 'pilot' },
  { id: 'phase-4', label: 'Phase 4: Scale', maturity: 'production-ready', timelinePhase: 'production' },
];

function maturityIndex(level: MaturityLevel): number {
  return MATURITY_ORDER.indexOf(level);
}

export function buildRoadmap(
  n: NormalizedIntake,
  route: RouteAssessment | null,
  plan: RoutePlan,
  timeline: TimelineEstimate,
): readonly RoadmapPhase[] {
  const ownerLabel = n.ownerDefined ? 'Project owner (named during intake)' : 'Project owner (not yet named)';
  const technicalOwner = n.troubleshooterDefined
    ? 'Technical owner (named during intake)'
    : 'Technical owner (not yet named)';

  return SEEDS.map((seed) => {
    const band = timeline.phases.find((phase) => phase.id === seed.timelinePhase);
    const achievable =
      route !== null && maturityIndex(route.maturityCeiling) >= maturityIndex(seed.maturity);

    const shared = {
      id: seed.id,
      label: seed.label,
      maturityReached: seed.maturity,
      estimatedTime: band?.bandLabel ?? 'Not estimated',
      achievableWithRecommendedRoute: achievable,
      provenance: 'estimate' as const,
    };

    switch (seed.id) {
      case 'phase-0':
        return {
          ...shared,
          goal: 'Confirm the problem is worth solving, and that the data and decisions behind it are understood.',
          mainWork: [
            'Write the problem, the affected people, and the cost of the current situation in plain terms.',
            n.sourceOfTruthDefined
              ? 'Confirm the authoritative source of data with the people who maintain it.'
              : 'Agree which single source of data is authoritative, in writing.',
            'Agree the smallest set of features that would count as useful.',
            ...(n.consequentialDomain !== 'none'
              ? [`Write down where the human ${n.consequentialDomain} decision sits, and who owns it.`]
              : []),
          ],
          requiredOwner: ownerLabel,
          mainRisk:
            'Building the wrong thing efficiently. Skipping this phase is the most common cause of abandoned internal tools.',
          exitCriteria: [
            'The problem statement is agreed by the people who feel the problem.',
            'One authoritative source of data is named.',
            'The must-have list is short enough to deliver.',
          ],
        };

      case 'phase-1':
        return {
          ...shared,
          goal: 'Make the workflow tangible so requirements can be settled before anything is committed to.',
          mainWork: [
            `Build a working prototype using ${plan.practical.interimRouteName ?? plan.practical.name}.`,
            'Walk two or three real users through it and record what breaks.',
            'Use fictional or sanitised data only.',
          ],
          requiredOwner: ownerLabel,
          mainRisk:
            'Mistaking the prototype for the system. A prototype holds nothing, identifies nobody, and enforces no permissions.',
          exitCriteria: [
            'Users can complete the workflow end to end without being guided.',
            'The feature list has stopped changing after each session.',
            'Everyone agrees what the first real version must do.',
          ],
        };

      case 'phase-2':
        return {
          ...shared,
          goal: 'Deliver the smallest version that solves the problem for real, with real data.',
          mainWork: [
            `Build the included MVP features on ${route?.name ?? 'the selected route'}.`,
            ...(n.requiredCapabilities.persistence > 0
              ? ['Set up the data store, and confirm a backup exists and can be restored.']
              : []),
            ...(n.requiredCapabilities.authentication > 0
              ? ['Set up accounts and check who can see what, per person.']
              : []),
            'Test with the same two or three users before opening it up.',
          ],
          requiredOwner: technicalOwner,
          mainRisk:
            'Scope creep during build. Each added feature delays the point at which anyone benefits.',
          exitCriteria: [
            'The included features work with real data.',
            'A named person keeps the data current.',
            'The success measures from the MVP recommendation are being met.',
          ],
        };

      case 'phase-3':
        return {
          ...shared,
          goal: 'Extend to the intended group under supervision, with a route back if it fails.',
          mainWork: [
            `Open access to the wider group (${n.userCountTier === 'unknown' ? 'size not stated' : `up to about ${n.userCountUpper} people`}).`,
            'Write the short guide and run one training session.',
            ...(n.requiredCapabilities['audit-history'] > 0
              ? ['Confirm changes are traceable to a person.']
              : []),
            'Agree how problems get reported and who answers.',
          ],
          requiredOwner: technicalOwner,
          mainRisk:
            'Rollout without support. If nobody answers questions in the first fortnight, adoption stops and does not restart.',
          exitCriteria: [
            'The wider group is using it without a fallback copy.',
            'Support questions are being answered within an agreed time.',
            'No unresolved access or permission problem remains.',
          ],
        };

      case 'phase-4':
        return {
          ...shared,
          goal: 'Operate it as a dependable system, or decide deliberately not to.',
          mainWork: [
            'Meet every production requirement, or accept a documented limitation instead.',
            'Set up monitoring so failures are noticed without a user reporting them.',
            'Agree a maintenance schedule and a review date.',
            ...(n.sensitiveData
              ? ['Review access on a schedule, and confirm the retention period is being honoured.']
              : []),
          ],
          requiredOwner: n.sensitiveData ? 'Security owner and technical owner' : technicalOwner,
          mainRisk:
            'Quiet decay: an unowned system that everyone depends on and nobody maintains.',
          exitCriteria: [
            'All ten production requirements are met or consciously waived in writing.',
            'A named maintenance owner has time allocated.',
            'A recovery plan has been tested at least once.',
          ],
        };
    }
  });
}

export function roadmapMaturityLabel(level: MaturityLevel): string {
  return MATURITY_LABELS[level];
}
