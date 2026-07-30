# Demo script: presenting The Feasibility Architect

A 12 to 15 minute walkthrough for an internal team or training session. Everything
runs locally in a browser. Nothing is saved, nothing is sent anywhere, and every
figure on screen is fictional or calculated from fictional answers.

## Before you start

```bash
npm install
npm run build
npm run preview     # then open the printed local address
```

`npm run dev` works too. The multi-file build needs the local server, so use
`npm run preview` rather than opening `dist/index.html` directly.

Have the browser at a comfortable zoom, and say up front: **this is a prototype
whose scoring rubric is illustrative, and its results require human review.**

## The walkthrough

### 1. Welcome screen — 1 minute

Point out three things:

- The **prototype banner** at the top of every screen.
- **"Nothing is saved."** Refreshing clears everything, by design.
- The **seven provenance labels**. Say: *"every number in this tool tells you
  what kind of number it is — from your answer, derived, an estimate, an
  assumption, demonstration data, unknown, or requires verification."*

Then click **Load fictional demo scenario**.

### 2. The demo scenario — 1 minute

Say: *"this is a fictional TCV recruitment and candidate assessment portal. Every
name, figure, and answer is invented for training. Two answers are deliberately
left unknown so you can see how missing information is handled."*

### 3. Intake — 3 minutes

Don't walk all nine steps. Show:

- The **chat transcript** with answers labelled *Demonstration data*.
- The **progress indicator**, and the two steps flagged **"1 unknown answer"**.
- Any question's **"Not sure / skip"** button. Say: *"nothing is invented on your
  behalf. Skipping records Unknown, and the assessment says so."*
- Click **Continue** through to step 5 (Budget and timeline) to show the unknown
  budget in place.

Then use the progress indicator to jump back to step 1, to show free backward
navigation, and note that steps ahead stay disabled.

### 4. Review project details — 2 minutes

- **95% complete, 41 of 43 answered, 2 unknown.**
- Read the caveat aloud: *"this measures how much intake information you have
  provided. It is **not** a feasibility score."*
- Show the **Unknown information** list with "Answer this" beside each item.
- Point at a section **Edit** button, then click **Generate assessment**.

### 5. Executive summary — 3 minutes

This is the heart of the demo.

- **Two separate scores**: Project Feasibility 72, Builder Fit 100 for the
  practical route, Assessment confidence 60 (moderate).
- Read the callout: *"Project Feasibility measures whether the project can
  realistically work. Builder Fit measures whether the current builder can
  implement and maintain the recommended route. A low Builder Fit score does not
  make a technically feasible project infeasible."*
- **Verdict: Conditional Go** — one of nine approved verdicts.
- **Route and destination**: best technical route, recommended practical path,
  best alternative, and separately **build method** and **final solution type**.
  Say: *"Claude Code and AI-assisted coding are ways of building. A custom hosted
  web application is what you end up with. They are different questions."*

### 6. Technical route and practical path — 2 minutes

The three cards. The point to land: *"technically best is not the same as build
this yourself today."* If you want to show the contrast, restart, choose **Start
assessment**, and answer as a non-technical builder on a client-facing app — the
practical card then reads **"Practical next step: secure developer support"** with
an interim route, and never "recommended for you now".

### 7. Figures and tables — 1 minute

Show the **Project feasibility by dimension** chart, then open **"View as
table"** beneath it. Say: *"every chart has a table with the same numbers, so
nothing is only available as a picture."* Mention the risk chart is a labelled
1 to 5 severity scale, not a likelihood-versus-impact grid, because the rubric
does not calculate those two axes.

### 8. Risk register and safeguards — 2 minutes

- **Highest-priority risks** — the four scored 4 or 5, expanded, each with
  trigger, consequence, mitigation, **owner**, and residual risk. Note: *"the
  owner is always a human role. Never the AI."*
- **Human safeguards** — the AI may / AI must not panels. Read one line:
  *"AI must not issue a final pass, conditional pass, fail, rejection, or hiring
  decision."* Then: *"these are mandatory conditions, not best practices."*

### 9. Cost, maturity, and the close — 2 minutes

- **Cost**: effort hours and categories, with **"Pricing must be verified before
  implementation."** Say: *"the tool never invents a price, a rate, or a quote."*
- **Maturity**: what a frontend-only prototype cannot provide — persistent
  records, authentication, role-based permissions, audit history, secure
  storage, email delivery, multi-user collaboration, backups, monitoring,
  recovery.
- **Final recommendation** and the **three immediate next actions**.

Close on the last callout: *"illustrative assessment, hand-written rubric,
estimates not quotations, results require human review, and it must not be used
to make final legal, financial, hiring, security, or implementation decisions."*

## Optional extras

- **Print**: Ctrl-P shows the print stylesheet — navigation and buttons drop
  away, every disclosure expands, disclaimers and provenance labels stay.
- **Edit and regenerate**: change the budget from unknown to a range, and watch
  confidence rise and the cost section change.
- **Keyboard only**: Tab from the top and complete the intake without a mouse.

## Questions you should expect

| Question | Answer |
| --- | --- |
| "Where do the numbers come from?" | A hand-written rubric in `docs/SCORING-RUBRIC.md`. Every score lists the rules that produced it. It is illustrative, not validated. |
| "Does it call an AI or search the web?" | No. It makes no network requests at all. The scoring is deterministic local rules. |
| "Is our data safe in it?" | Nothing is stored or transmitted, but do not enter real candidate or client data into a prototype. Use fictional data. |
| "Can we use this to decide?" | No. It organises the thinking. A person decides, and the report says so in several places. |
| "Can we host it?" | Not yet. Options are in `docs/HOSTING-LATER.md`, and there are prerequisites first. |
| "Why did it not recommend Claude Code?" | Because the requirements did not need it. Tests assert that no Claude-branded route wins the simple, CRM, workflow, or restricted-environment scenarios, even when listed as preferred. |

## Do not, during a demo

- Do not enter real candidate, client, employee, or financial information.
- Do not present any figure as a quote, a benchmark, or a commitment.
- Do not describe the prototype as production-ready, or as a decision-maker.
