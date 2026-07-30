import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type { RiskOwner, SourceOfTruthResult } from '@/engine/types';
import { SOURCE_OF_TRUTH_UNDEFINED_STATEMENT } from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Source-of-truth output.
 *
 * Where no authoritative source has been identified, the result says so plainly
 * rather than picking one on the user's behalf.
 * ------------------------------------------------------------------ */

const AUTHORITATIVE_LABELS: Record<NormalizedIntake['sourceOfTruth'], string> = {
  'single-system': 'A single system of record, as stated during intake',
  'one-spreadsheet': 'One agreed spreadsheet, as stated during intake',
  'several-places': 'Not established: data currently lives in several places with none authoritative',
  person: "Not established: the current source of truth is one person's knowledge",
  undefined: 'Not established: no source of truth has been defined',
  unknown: 'Not established: the source of truth was not stated',
};

const LOCATION_LABELS: Record<string, string> = {
  local: 'A local computer',
  'shared-drive': 'A shared drive',
  'cloud-storage': 'Cloud storage',
  inbox: 'An email inbox',
  'saas-tool': 'Another SaaS tool',
  physical: 'Physical or paper files',
  nowhere: 'Nothing exists yet',
};

const DATA_LABELS: Record<string, string> = {
  spreadsheets: 'Spreadsheets',
  documents: 'Documents',
  email: 'Email threads',
  forms: 'Form responses',
  notes: 'Personal or team notes',
  exports: 'Exports from an existing system',
  paper: 'Paper records',
  'none-yet': 'No existing data',
};

export function buildSourceOfTruth(n: NormalizedIntake): SourceOfTruthResult {
  const defined = n.sourceOfTruthDefined;

  const secondarySources = n.dataLocations
    .filter((id) => id !== 'nowhere')
    .map((id) => LOCATION_LABELS[id] ?? id);
  if (n.availableData.length > 0) {
    secondarySources.push(
      ...n.availableData.filter((id) => id !== 'none-yet').map((id) => DATA_LABELS[id] ?? id),
    );
  }

  const readOnlyInformation: string[] = [];
  const editableInformation: string[] = [];
  const requiresHumanConfirmation: string[] = [];
  const mustNeverBeInferred: string[] = [];

  if (n.readOnlyDataRequired === true) {
    readOnlyInformation.push('Information you identified as needing to stay read-only');
  }
  if (n.readOnlyDataRequired === null) {
    readOnlyInformation.push('Not determined: whether any information must stay read-only was not stated');
  }

  if (n.consequentialDomain === 'hiring') {
    readOnlyInformation.push(
      'Submitted candidate details as originally provided',
      'Interview notes once the stage is closed',
      'Recorded stage outcomes and who recorded them',
    );
    editableInformation.push(
      'Draft recruiter notes before the stage is closed',
      'Scheduling and stage-progress fields',
      'Draft candidate communications awaiting review',
    );
    requiresHumanConfirmation.push(
      'Every stage outcome (pass, conditional pass, or fail)',
      'Any candidate communication before it is sent',
      'Any change to a recorded recommendation',
    );
    mustNeverBeInferred.push(
      'A candidate’s suitability, ranking, or hiring outcome',
      'Anything about a protected characteristic',
      'Qualifications or employment history that were not supplied',
      'Interview feedback that no interviewer actually gave',
    );
  } else {
    editableInformation.push('Working fields that the team updates as part of the process');
    requiresHumanConfirmation.push('Any output used to make a decision about a person or a commitment');
    mustNeverBeInferred.push(
      'Facts about people that were not supplied',
      'Figures presented as measured when they were estimated',
    );
  }

  if (n.sensitiveData) {
    mustNeverBeInferred.push('Any sensitive attribute not explicitly provided');
  }

  const approvalOwner: RiskOwner =
    n.consequentialDomain === 'hiring'
      ? 'Hiring manager'
      : n.consequentialDomain === 'security'
        ? 'Security owner'
        : n.ownerDefined
          ? 'Project owner'
          : 'Project owner';

  const backupRequirement = n.requiredCapabilities.persistence > 0
    ? defined
      ? 'Required: a scheduled backup of the authoritative source, with a restore tested at least once.'
      : 'Required, but cannot be specified until the authoritative source is agreed.'
    : 'Not required while nothing is retained between uses.';

  const auditHistoryRequirement =
    n.requiredCapabilities['audit-history'] > 0
      ? 'Required: who changed what and when, retained for records that support decisions.'
      : n.consequentialDomain !== 'none'
        ? 'Recommended: decisions about people should be traceable even where not strictly required.'
        : 'Not identified as required from the answers given.';

  const recoveryRequirement =
    n.requiredCapabilities.persistence > 0
      ? 'Required: a named person who can restore data, and an agreed acceptable loss window.'
      : 'Limited: with nothing retained, recovery means re-entering information rather than restoring it.';

  return {
    authoritativeSource: AUTHORITATIVE_LABELS[n.sourceOfTruth],
    authoritativeSourceDefined: defined,
    secondarySources: secondarySources.length > 0 ? [...new Set(secondarySources)] : ['None identified'],
    readOnlyInformation,
    editableInformation,
    requiresHumanConfirmation,
    mustNeverBeInferred,
    approvalOwner,
    backupRequirement,
    auditHistoryRequirement,
    recoveryRequirement,
    statement: defined ? null : SOURCE_OF_TRUTH_UNDEFINED_STATEMENT,
    provenance: 'derived',
  };
}
