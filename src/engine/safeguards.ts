import type { NormalizedIntake } from '@/engine/normalizeAnswers';
import type { HumanApprovalRequirement, RiskOwner, Safeguards } from '@/engine/types';

/* ------------------------------------------------------------------ *
 * Human-decision safeguards.
 *
 * Where a project touches a consequential domain, AI may organise, summarise,
 * compare, and draft. It may not make or execute the final decision, and human
 * approval becomes a mandatory condition rather than a suggestion.
 * ------------------------------------------------------------------ */

const DOMAIN_OWNER: Record<string, RiskOwner> = {
  hiring: 'Hiring manager',
  legal: 'Project owner',
  financial: 'Project owner',
  security: 'Security owner',
  medical: 'Human reviewer',
  none: 'Project owner',
};

/** Production requirements a frontend-only prototype cannot satisfy. */
export const PROTOTYPE_CANNOT_SATISFY: readonly string[] = [
  'Persistent records that survive a page refresh',
  'Authentication',
  'Role-based access control',
  'Audit history of changes',
  'Secure document storage',
  'Email or notification delivery',
  'Multi-user collaboration',
  'Backups and recovery',
];

export function buildSafeguards(n: NormalizedIntake): Safeguards {
  const domain = n.consequentialDomain;
  const owner = DOMAIN_OWNER[domain] ?? 'Project owner';

  const aiMayDo: string[] = [
    'Organise and structure information that people have entered',
    'Summarise notes into a consistent format',
    'Compare records side by side against stated criteria',
    'Draft text for a person to review, edit, and send',
    'Highlight gaps, inconsistencies, and missing information',
  ];

  const aiMustNotDo: string[] = [
    'Present generated content as verified fact',
    'Act on information it has inferred rather than been given',
  ];

  const humanApprovalRequirements: HumanApprovalRequirement[] = [];
  const notes: string[] = [];

  if (domain === 'hiring') {
    aiMustNotDo.push(
      'Issue a final pass, conditional pass, fail, rejection, or hiring decision',
      'Send any message to a candidate without human review',
      'Rank or score candidates in a way that substitutes for human judgement',
    );
    humanApprovalRequirements.push(
      {
        action: 'Interview stage outcome (pass, conditional pass, or fail)',
        requirement: 'Recorded only after a named interviewer decides. The system stores the decision; it does not make it.',
        owner: 'Hiring manager',
      },
      {
        action: 'Candidate communications',
        requirement: 'Drafts may be prepared automatically, but a person must review and send every message.',
        owner: 'Human reviewer',
      },
      {
        action: 'Rejection or progression of a candidate',
        requirement: 'Requires explicit human approval, attributed to the person who made it.',
        owner: 'Hiring manager',
      },
    );
    notes.push(
      'Candidate and interview information is sensitive HR data. Treat it as personal data with a lawful basis, a retention period, and restricted access.',
      'Any real implementation needs role-based access, an authoritative candidate record, and an audit history of stage and recommendation changes.',
    );
  }

  if (domain === 'financial') {
    aiMustNotDo.push('Approve, schedule, or execute any payment or financial commitment');
    humanApprovalRequirements.push({
      action: 'Financial commitment or payment',
      requirement: 'Requires human authorisation before execution.',
      owner: 'Project owner',
    });
  }
  if (domain === 'legal') {
    aiMustNotDo.push('Give legal advice or issue a binding document without review');
    humanApprovalRequirements.push({
      action: 'Legal or contractual output',
      requirement: 'Requires review by a qualified person before use.',
      owner: 'Project owner',
    });
  }
  if (domain === 'security') {
    aiMustNotDo.push('Grant, change, or revoke access rights');
    humanApprovalRequirements.push({
      action: 'Access or permission change',
      requirement: 'Requires approval by the named security owner.',
      owner: 'Security owner',
    });
  }
  if (domain === 'medical') {
    aiMustNotDo.push('Offer a diagnosis or clinical recommendation');
    humanApprovalRequirements.push({
      action: 'Any clinical judgement',
      requirement: 'Requires a qualified clinician. This tool is not suitable for clinical use.',
      owner: 'Human reviewer',
    });
  }

  for (const action of n.humanControlled) {
    const label = HUMAN_CONTROLLED_LABELS[action];
    if (label) {
      humanApprovalRequirements.push({
        action: label,
        requirement: 'You listed this as something that must stay under human control.',
        owner,
      });
    }
  }

  const sensitiveDataHandling: string[] = [];
  if (n.sensitiveData) {
    sensitiveDataHandling.push(
      'Restrict access to the people who need it, per person rather than per file',
      'Agree how long information is kept and when it is deleted',
      'Keep sensitive information out of demonstrations, screenshots, and chat tools',
      'Record who may view, edit, export, and delete each kind of information',
    );
    if (n.personalData) {
      sensitiveDataHandling.push(
        'Personal information about identifiable people needs a lawful basis and a retention period',
      );
    }
    if (n.regulatedData) {
      sensitiveDataHandling.push(
        'Regulated data requires a compliance check before any tool is chosen, not after',
      );
    }
  } else {
    sensitiveDataHandling.push('No sensitive information was identified, so no special handling was derived.');
  }

  return {
    consequentialDomain: domain,
    aiMayDo,
    aiMustNotDo,
    humanApprovalRequirements,
    sensitiveDataHandling,
    productionRequirementsUnmetByPrototype: PROTOTYPE_CANNOT_SATISFY,
    notes,
  };
}

const HUMAN_CONTROLLED_LABELS: Record<string, string> = {
  'final-recommendations': 'Final recommendations or decisions',
  communications: 'Messages sent to people',
  deletion: 'Deleting records',
  'external-sharing': 'Sharing outside the team',
  'published-output': 'Anything published',
  costs: 'Approving costs',
};
