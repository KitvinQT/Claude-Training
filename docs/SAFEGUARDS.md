# Safeguards, source-of-truth rules, and human approval

Source of truth for this document: `src/engine/safeguards.ts` and
`src/engine/buildSourceOfTruth.ts`.

## Human-decision rule

Where a project touches a consequential domain — **hiring, legal, financial,
security, or medical** — AI may:

- Organise and structure information that people have entered
- Summarise notes into a consistent format
- Compare records side by side against stated criteria
- Draft text for a person to review, edit, and send
- Highlight gaps, inconsistencies, and missing information

AI may **not**:

- Present generated content as verified fact
- Act on information it has inferred rather than been given
- Make or execute the final decision in any of those domains

Human approval becomes a **mandatory condition**, not a suggestion. The
human-decision gate vetoes a plain "Proceed" verdict for any consequential domain,
and forces "Revise before building" where the described features imply automatic
action without a human step.

Detection is keyword-based over the answers given, plus the sensitive-information
selections. It errs towards flagging rather than missing.

## Recruitment and candidate assessment (fictional TCV scenario)

Recognised as the **hiring** domain. The engine then requires:

| Area | Requirement |
| --- | --- |
| Stage outcomes | Pass, conditional pass, or fail is recorded only after a named interviewer decides. The system stores the decision; it does not make it. Owner: hiring manager. |
| Candidate communications | Drafts may be prepared automatically; a person must review and send every message. Owner: human reviewer. |
| Progression and rejection | Requires explicit human approval, attributed to the person who made it. Owner: hiring manager. |
| Data classification | Candidate and interview information is sensitive HR data: personal data with a lawful basis, a retention period, and restricted access. |
| Access control | Role-based access is required for any real implementation. |
| Candidate record | An authoritative candidate record must be identified. |
| Audit history | Stage and recommendation changes must be traceable. |
| Never inferred | Suitability, ranking, or hiring outcome; anything about a protected characteristic; qualifications or employment history not supplied; interview feedback no interviewer gave. |

AI must not issue a final pass, fail, rejection, or hiring decision
automatically, and must not send a candidate message without human review. Both
are asserted by test.

All demonstration content is fictional. No real candidate, client, financial,
credential, or operational information appears anywhere in this repository.

## What a frontend-only prototype cannot satisfy

The engine states this explicitly, and it applies to this assessment tool itself:

- Persistent records that survive a page refresh
- Authentication
- Role-based access control
- Audit history of changes
- Secure document storage
- Email or notification delivery
- Multi-user collaboration
- Backups and recovery

A prototype can demonstrate the workflow, settle requirements, and prove the
interface. It cannot be the operating system of record.

## Source-of-truth output

For every assessment the engine returns:

| Field | Meaning |
| --- | --- |
| Authoritative source | The single copy that wins when two disagree |
| Secondary sources | Every other place the information currently lives |
| Read-only information | What must not be edited once recorded |
| Editable information | What the team updates as part of the process |
| Requires human confirmation | What a person must confirm before it counts |
| Must never be inferred | What the system may not fill in on its own |
| Approval owner | The human role that approves changes |
| Backup requirement | Whether a backup is required, and of what |
| Audit-history requirement | Whether change history is required |
| Recovery requirement | Who can restore, and the acceptable loss window |

Where no authoritative source has been identified, the result is labelled:

> **Source of truth requires definition before implementation.**

The engine never selects an authoritative source on the user's behalf.

## Known limitations of the safeguards

1. Domain detection reads the words the user wrote. An unusual description of a consequential process may not be recognised, so a human should still check the classification.
2. The safeguards describe what *should* be required. They cannot enforce anything: this is an assessment tool, not a control.
3. The lists are written for internal business processes. They are not legal advice, and they do not enumerate any specific jurisdiction's obligations.
4. Sensitive-data handling guidance is generic. A regulated context needs a compliance review before any tool is chosen, not after.
