import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type {
  BuilderFitResult,
  DurationBand,
  MaturityLevel,
  RouteAssessment,
  TimelineEstimate,
  TimelinePhase,
  TimelinePhaseId,
} from '@/engine/types';
import {
  DURATION_BAND_LABELS,
  DURATION_BAND_ORDER,
  MATURITY_ORDER,
  TIMELINE_PHASE_LABELS,
} from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Timeline engine.
 *
 * Each phase is expressed as one of the agreed duration bands - never a precise
 * date. A lower Builder Fit lengthens the calendar estimate; it never lowers
 * technical feasibility.
 * ------------------------------------------------------------------ */

/** Calendar hours per phase, as a share of the route's build effort. */
const PHASE_SHARE: Record<TimelinePhaseId, number> = {
  validation: 0.08,
  prototype: 0.25,
  mvp: 0.7,
  pilot: 1,
  production: 1.6,
  'training-documentation': 0.15,
  'ongoing-maintenance': 0.08,
};

function bandForHours(hours: number): DurationBand {
  if (hours <= 1) return '30-minutes-1-hour';
  if (hours <= 4) return '2-4-hours';
  if (hours <= 12) return '1-2-days';
  if (hours <= 30) return '3-5-days';
  if (hours <= 70) return '1-2-weeks';
  if (hours <= 140) return '2-4-weeks';
  if (hours <= 400) return '1-3-months';
  return 'more-than-3-months';
}

function bandIndex(band: DurationBand): number {
  return DURATION_BAND_ORDER.indexOf(band);
}

function maturityIndex(level: MaturityLevel): number {
  return MATURITY_ORDER.indexOf(level);
}

const PHASE_MATURITY: Record<TimelinePhaseId, MaturityLevel | null> = {
  validation: null,
  prototype: 'interactive-prototype',
  mvp: 'mvp',
  pilot: 'pilot',
  production: 'production-ready',
  'training-documentation': null,
  'ongoing-maintenance': null,
};

export function estimateTimeline(
  n: NormalizedIntake,
  route: RouteAssessment | null,
  builderFit: BuilderFitResult | null,
  adjustedHighHours: number,
): TimelineEstimate {
  const factors: string[] = [];

  factors.push(
    route
      ? `Route: ${route.name}, estimated at ${route.effort.lowHours}-${route.effort.highHours} builder hours before adjustment.`
      : 'No eligible route, so phases are shown as indicative only.',
  );
  factors.push(
    `Scope: ${n.scopeTier === 'unknown' ? 'not stated, treated as moderate' : `${n.scopeTier}, ${n.mustHaveCount} must-have features`}.`,
  );
  factors.push(
    `Data preparation: ${n.hasData ? 'existing data needs cleaning and agreeing' : 'no existing data to prepare'}.`,
  );
  factors.push(
    `Integrations: ${n.integrationsNeeded ? 'at least one implied, which adds uncertainty' : 'none identified'}.`,
  );
  factors.push(
    `Security requirements: ${n.sensitiveData ? 'sensitive information means access design and review time' : 'no sensitive information identified'}.`,
  );
  factors.push(
    `Testing: ${(n.abilities['testing'] ?? 0) >= 3 ? 'the builder is confident testing, so less external checking is needed' : 'testing confidence is limited, so allow time for checking by someone else'}.`,
  );
  factors.push('Documentation and training time is included as a separate phase.');
  factors.push(
    `Deployment: ${route?.requiredHosting ?? 'not applicable'} ${route?.requiredHosting.startsWith('Provided') ? '(no deployment work)' : ''}`.trim(),
  );
  factors.push(
    n.ownerDefined
      ? 'Approval delays: an owner is named, which usually shortens decision time.'
      : 'Approval delays: no owner is named, so allow additional time for decisions.',
  );

  const builderFitEffect = builderFit
    ? builderFit.score >= 70
      ? `Builder Fit of ${builderFit.score} does not extend the timeline.`
      : `Builder Fit of ${builderFit.score} extends the calendar estimate to allow for learning, checking, and rework. It does not change what is technically possible.`
    : 'No Builder Fit adjustment applied.';

  const weeklyHours = n.weeklyHours;
  const phases: TimelinePhase[] = (Object.keys(PHASE_SHARE) as TimelinePhaseId[]).map((id) => {
    const share = PHASE_SHARE[id];
    const hours = Math.max(1, Math.round(adjustedHighHours * share));
    let band = bandForHours(hours);

    // Approval and coordination stretch the later phases beyond pure build time.
    if ((id === 'pilot' || id === 'production') && !n.ownerDefined) {
      band = DURATION_BAND_ORDER[Math.min(DURATION_BAND_ORDER.length - 1, bandIndex(band) + 1)] ?? band;
    }
    if (id === 'production' && n.sensitiveData) {
      band = DURATION_BAND_ORDER[Math.min(DURATION_BAND_ORDER.length - 1, bandIndex(band) + 1)] ?? band;
    }
    if (id === 'ongoing-maintenance') {
      band = route?.maintenanceLevel === 'high' ? '1-2-days' : route?.maintenanceLevel === 'moderate' ? '2-4-hours' : '30-minutes-1-hour';
    }

    const requiredMaturity = PHASE_MATURITY[id];
    const achievable =
      route === null
        ? false
        : requiredMaturity === null
          ? true
          : maturityIndex(route.maturityCeiling) >= maturityIndex(requiredMaturity);

    const basis: string[] = [
      `About ${Math.round(share * 100)}% of the adjusted build effort (${hours} hours of work).`,
    ];
    if (id === 'ongoing-maintenance') {
      basis.length = 0;
      basis.push(
        `Recurring, not one-off: based on the ${route?.maintenanceLevel ?? 'unknown'} maintenance level of the recommended route, expressed per month.`,
      );
    }
    if (weeklyHours !== null && id !== 'ongoing-maintenance') {
      basis.push(
        `At the stated ${weeklyHours} hours available per week, calendar time is longer than working time.`,
      );
    } else if (id !== 'ongoing-maintenance') {
      basis.push('Weekly available time was not stated, so calendar time could not be refined.');
    }
    if (!achievable && requiredMaturity !== null) {
      basis.push(
        `${route?.name ?? 'The route'} cannot reach this level, so this phase would need a different route.`,
      );
    }

    return {
      id,
      label: TIMELINE_PHASE_LABELS[id],
      band,
      bandLabel: DURATION_BAND_LABELS[band],
      achievable,
      basis,
      provenance: 'estimate',
    };
  });

  /* ---- deadline assessment ---- */
  let deadlineAchievable: boolean | null = null;
  let deadlineAssessment: string;
  const targetPhase = phases.find((phase) => phase.id === maturityToPhase(n.requiredMaturity));
  if (n.deadlineWeeks === null || weeklyHours === null || !route || !targetPhase) {
    deadlineAssessment =
      'Not assessed: a deadline, the weekly time available, and an eligible route are all needed to judge this.';
  } else {
    const capacityHours = weeklyHours * n.deadlineWeeks;
    const neededHours = Math.round(adjustedHighHours * PHASE_SHARE[targetPhase.id]);
    deadlineAchievable = neededHours <= capacityHours;
    deadlineAssessment = deadlineAchievable
      ? `Reaching ${targetPhase.label.toLowerCase()} needs roughly ${neededHours} hours, against about ${Math.round(capacityHours)} hours available before the deadline. Achievable on these estimates.`
      : `Reaching ${targetPhase.label.toLowerCase()} needs roughly ${neededHours} hours, against about ${Math.round(capacityHours)} hours available before the deadline. Not achievable without reducing scope, extending the deadline, or adding help.`;
  }

  return {
    phases,
    factors,
    builderFitEffect,
    deadlineAssessment,
    deadlineAchievable,
    provenance: 'estimate',
  };
}

function maturityToPhase(level: MaturityLevel): TimelinePhaseId {
  switch (level) {
    case 'concept':
    case 'visual-mockup':
    case 'interactive-prototype':
      return 'prototype';
    case 'mvp':
      return 'mvp';
    case 'pilot':
      return 'pilot';
    case 'production-ready':
      return 'production';
  }
}
