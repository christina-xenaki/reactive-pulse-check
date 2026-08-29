# Interface copy — Reactive Pulse Check

**This file is the source of truth for every user-facing string in this tool.** Where a string appears here, use it verbatim. Do not paraphrase it, shorten it, or improve it. Where a string is needed and is not here, do not invent it: leave a clearly marked placeholder and flag it.

Strings are given IDs so `config/config.json` can reference them rather than duplicating them.

---

## 1. Tone rules

For anything written to match this file.

**Write the way a senior practitioner talks to a colleague they respect.** Not a vendor, not a coach, not a compliance officer.

- **Plain sentences.** Say the thing. A sentence that needs reading twice has failed.
- **No LLM cadence.** Avoid "no X, no Y, just Z." Avoid "it's not about X, it's about Y." Avoid rhetorical questions as headings. Avoid "simply," "seamlessly," "empower," "unlock," "leverage," "journey."
- **British English.** -ise endings, "organisation," "practise" as a verb.
- **No exclamation marks. No emoji.** This tool is used on days that are going badly.
- **Never congratulate the user.** No "great choice," no "you're on the right track." They are assessing something unpleasant.
- **Never reassure falsely.** The tool does not know whether the situation is fine.
- **Second person for instructions, third person for the tool.** "You'll get a recommendation." "The tool does not store your answers."
- **Say "recommendation," never "decision."** The tool recommends. The user decides. This distinction is load-bearing and appears throughout.
- **Say "what has been said," never "the claim."** See SPEC.md section D. "Claim" carries regulatory and legal meaning this tool is not qualified to invoke.
- **Uncertainty is stated, not hedged into.** "The tool cannot tell you whether this is true" is honest. "This may potentially be something to consider" is noise.
- **No urgency language.** No "act now," no countdowns, no red banners. The situation supplies the urgency.

---

## 2. Page-level strings

**`page.title`**
> Reactive Pulse Check

**`page.strapline`**
> A structured read on whether to respond, and at what level.

**`page.intro`**
> Answer nine questions about the situation. You'll get a recommended response level, the reasoning behind it, and a record you can export. It takes about ninety seconds.
>
> You are never asked what the issue is. Every question is about the shape of the situation, not its content.

**`page.privacyNote`**
> This runs in your browser, on your device. Your answers are never uploaded anywhere and nothing is stored after you close the page. There is no server and no account, so an assessment of something sensitive leaves no trace here.

**`page.privacyVerify`**
> You can check this yourself: open your browser's network tab while using the tool. The only requests it makes are for its own configuration file and the interface font.

**`page.disclaimerTeaser`** — shown under the recommendation, links to the full text
> This is a pulse check, not a decision. What it can and can't tell you.

**`page.disclaimerFull`**
> **What this tool can and can't tell you**
>
> This is a pulse check. It gives you a fast, structured read on a situation and shows you the reasoning behind it. It is not a diagnosis.
>
> It does not replace the judgement of your communications or public affairs team. It does not replace the specialists who own the risk — legal, compliance, regulatory. It does not replace the person who actually knows the facts.
>
> It does not replace your organisation's own escalation procedure. If you have one, it names who is accountable for this decision and who must be consulted before it is made. This tool does not know who those people are and cannot stand in for them.
>
> The tool has not read the thing you are assessing and never asks. It works from the shape of the situation as you have described it, which means its recommendation is only as good as your answers.
>
> Sector flags are a prompt to consult the function that owns that risk. They are not a compliance decision and not legal advice.
>
> The regulatory regimes named are drawn from UK and EU practice. They will differ elsewhere and they change over time.
>
> A recommendation to stay at Level 1 is not a guarantee that an issue will not grow.

---

## 3. The question set

Question and option wording is canonical here. It does double duty as interface copy and as the exported record, which is why options are full descriptive phrases rather than terse labels: with no free text anywhere, a reader who was not in the room has only these words to reconstruct the situation from.

**`q.progress`**
> Question {n} of {total}

**`q.optional`**
> Optional. You can skip this.

---

**`q1.text`** — What kind of issue has been raised?
Single choice.

| ID | Option |
|---|---|
| `q1.a` | A journalist has contacted us |
| `q1.b` | A post or thread on social media |
| `q1.c` | A review, rating or complaint on a public platform |
| `q1.d` | A statement made by a competitor or rival organisation |
| `q1.e` | A campaign group, NGO or activist action |
| `q1.f` | A regulator, politician or public body has raised it |
| `q1.g` | Something that looks like an internal leak |
| `q1.h` | A rumour circulating privately, not yet published anywhere |
| `q1.i` | An incident at another organisation in our sector |
| `q1.j` | An old story about us resurfacing |

---

**`q2.text`** — How directly is the organisation mentioned in this issue?
Single choice.

| ID | Option |
|---|---|
| `q2.a` | Named directly, and we are the subject of it |
| `q2.b` | Named, but we are not the main subject |
| `q2.c` | Not named, but anyone in our sector would know it's us |
| `q2.d` | Our sector or a peer organisation only; we are not identifiable |

---

**`q2b.text`** — Is a named individual involved?
Multi-select. Shown unless `q2.d` is selected.

**`q2b.help`**
> Asked separately because a named individual is not simply a stronger version of the organisation being named. It can be more serious, and it changes which rules apply.

| ID | Option |
|---|---|
| `q2b.a` | A board member or C-suite executive, in their organisational role |
| `q2b.b` | A board member or C-suite executive, in a personal capacity |
| `q2b.c` | A senior leader below board level |
| `q2b.d` | An employee |
| `q2b.e` | A contractor, agency or freelancer working for us |
| `q2b.f` | A partner, supplier or client organisation |
| `q2b.g` | A customer, patient or service user |
| `q2b.h` | No individual is named |

---

**`q3.text`** — What do we know about whether what's been said is accurate?
Single choice.

| ID | Option |
|---|---|
| `q3.a` | True, and we knew |
| `q3.b` | True, and we did not know until now |
| `q3.c` | Partly true, but the central point is wrong |
| `q3.d` | False, but plausible enough that people will believe it |
| `q3.e` | False, and self-evidently so |
| `q3.f` | We cannot verify it yet |

---

**`q4.text`** — How far has it travelled so far?
Single choice.

| ID | Option |
|---|---|
| `q4.a` | Only the originator and we know about it |
| `q4.b` | A small audience has seen it; nobody else has picked it up |
| `q4.c` | An amplifier has picked it up: a trade or niche outlet |
| `q4.d` | An amplifier has picked it up: a national outlet or a large account |
| `q4.e` | It is already everywhere we look |

---

**`q5.text`** — Which way is it moving?
Single choice.

| ID | Option |
|---|---|
| `q5.a` | Growing quickly |
| `q5.b` | Growing slowly |
| `q5.c` | Flat |
| `q5.d` | Already fading |
| `q5.e` | Too early to tell; this is under an hour old |

---

**`q6.text`** — Who is carrying it?
Single choice.

| ID | Option |
|---|---|
| `q6.a` | Someone with real distribution — a journalist, a large account, a broadcaster |
| `q6.b` | An account with a committed audience but little reach beyond it |
| `q6.c` | An anonymous or very low-reach account |
| `q6.d` | An organised group running a planned campaign |
| `q6.e` | Nobody yet; we found this ourselves |

---

**`q7.text`** — Is there a deadline we don't control?
Single choice.

| ID | Option |
|---|---|
| `q7.a` | Yes, publication in under four hours |
| `q7.b` | Yes, today |
| `q7.c` | Yes, within the next few days |
| `q7.d` | No external deadline |

---

**`q8.text`** — Who else, beyond the originator, has a stake in this?
Multi-select.

| ID | Option |
|---|---|
| `q8.a` | Employees are already discussing it |
| `q8.b` | A regulator has an interest in this subject |
| `q8.c` | Customers, patients or service users are directly affected |
| `q8.d` | Investors, funders or trustees will ask about it |
| `q8.e` | A partner, supplier or client is implicated |
| `q8.f` | Nobody beyond the originator yet |

---

**`q9.text`** — Is there anyone in the organisation pushing for a response?
Single choice. Optional.

**`q9.help`** — shown before the user answers
> This question does not score. It is here because "a senior leader wants something said" is a real consideration, and it is not the one this assessment measures. Recording it separately means the decision can be explained later on the grounds it was actually made.

| ID | Option |
|---|---|
| `q9.a` | Nobody; we are assessing it ourselves |
| `q9.b` | The comms team |
| `q9.c` | A senior leader has seen it and wants something said |
| `q9.d` | The CEO or an equivalent has seen it and wants something said |
| `q9.e` | Legal, compliance or regulatory have raised it |

*Alternate `q9.help` wordings, recorded so the choice is not lost. Do not use without changing this file.*
*A:* "This question does not score. Internal pressure to respond and external risk are different things, and they can look identical when you are in the middle of one. Recording which is which keeps them separate."
*C:* "This question does not score. Where the pressure to respond is coming from is a legitimate input to your decision. It is a separate input from the situation itself, and this assessment only measures the situation."
*D:* "This question does not score. It records where the pressure to respond is coming from, because that is a different question from whether the situation warrants one."

---

## 4. Branch questions

Shown after Q1, selected by trigger type.

**Journalist enquiry** (`q1.a`)
- `br.journ.1` — What have they asked for?
  - `br.journ.1.a` — Comment on a specific point
  - `br.journ.1.b` — General background
  - `br.journ.1.c` — Confirmation of a fact
  - `br.journ.1.d` — Right of reply on something they intend to publish regardless
- `br.journ.2` — Do we have an existing relationship with this outlet?
  - `br.journ.2.a` — Yes, a good working one
  - `br.journ.2.b` — Yes, but a difficult one
  - `br.journ.2.c` — No prior contact
- `br.journ.3` — Has a version of this story run before?
  - `br.journ.3.a` — Yes → *reveals the prior-coverage block*
  - `br.journ.3.b` — No
  - `br.journ.3.c` — We don't know

**Social post or thread** (`q1.b`)
- `br.social.1` — Can we reply to this account privately?
  - `br.social.1.a` — Yes, direct messages are open
  - `br.social.1.b` — No, public reply only
  - `br.social.1.c` — We could contact them off-platform
- `br.social.2` — Has anyone from our organisation already replied publicly?
  - `br.social.2.a` — No
  - `br.social.2.b` — Yes, from an official account
  - `br.social.2.c` — Yes, from a personal account

**Review or complaint** (`q1.c`)
- `br.review.1` — Is this a service failure we can actually fix?
  - `br.review.1.a` — Yes, and we can say so
  - `br.review.1.b` — Yes, but not quickly
  - `br.review.1.c` — No, we don't accept the account of what happened
  - `br.review.1.d` — We can't tell yet
- `br.review.2` — Does the platform allow a public reply?
  - `br.review.2.a` — Yes
  - `br.review.2.b` — No
  - `br.review.2.c` — Yes, but replies are visibly from the organisation and permanent

**Competitor statement** (`q1.d`)
- `br.comp.1` — What kind of statement is it?
  - `br.comp.1.a` — Comparative advertising
  - `br.comp.1.b` — A statement of fact about us
  - `br.comp.1.c` — A general claim about the market
- `br.comp.2` — Is there a route other than public comment?
  - `br.comp.2.a` — Direct approach to the organisation
  - `br.comp.2.b` — Trade body or industry forum
  - `br.comp.2.c` — Advertising or competition regulator
  - `br.comp.2.d` — No route other than public comment

**Campaign group or NGO** (`q1.e`)
- `br.ngo.1` — Is there a planned moment attached?
  - `br.ngo.1.a` — Yes: an AGM, results, or a fixture in our calendar
  - `br.ngo.1.b` — Yes: a report launch or campaign day of their own
  - `br.ngo.1.c` — No planned moment we know of
- `br.ngo.2` — Have they approached us privately first?
  - `br.ngo.2.a` — Yes, and we responded
  - `br.ngo.2.b` — Yes, and we did not respond
  - `br.ngo.2.c` — No

**Regulator, politician or public body** (`q1.f`)
- `br.reg.1` — What form has this taken?
  - `br.reg.1.a` — A formal process with a deadline
  - `br.reg.1.b` — A written request for information
  - `br.reg.1.c` — A public statement with no direct approach to us
- `br.reg.2` — Is there an obligation to respond through a particular channel?
  - `br.reg.2.a` — Yes, and we know what it is
  - `br.reg.2.b` — Yes, but we need to check what it is
  - `br.reg.2.c` — No

**Apparent leak** (`q1.g`)
- `br.leak.1` — Is the underlying information accurate?
  - `br.leak.1.a` — Yes
  - `br.leak.1.b` — Partly
  - `br.leak.1.c` — No
  - `br.leak.1.d` — We can't verify yet
- `br.leak.2` — What kind of information is it?
  - `br.leak.2.a` — Market-sensitive
  - `br.leak.2.b` — Personal data about an individual
  - `br.leak.2.c` — Commercially confidential but neither of the above
  - `br.leak.2.d` — Internal but not sensitive

**Private rumour** (`q1.h`)
- `br.rum.1` — Has any journalist contacted us about it?
  - `br.rum.1.a` — Yes
  - `br.rum.1.b` — No
  - `br.rum.1.c` — Not yet, but we expect it
- `br.rum.2` — Would responding be the first public confirmation this exists?
  - `br.rum.2.a` — Yes
  - `br.rum.2.b` — No, it is already public somewhere
  - `br.rum.2.c` — We don't know

**Sector incident** (`q1.i`)
- `br.sect.1` — What do we share with the organisation involved?
  - `br.sect.1.a` — A supplier, contractor or partner
  - `br.sect.1.b` — A practice or process that has been criticised
  - `br.sect.1.c` — A regulator
  - `br.sect.1.d` — Nothing beyond the sector
- `br.sect.2` — Has anyone asked us about it?
  - `br.sect.2.a` — Yes, a journalist or stakeholder has asked
  - `br.sect.2.b` — No, we are anticipating

**Old story resurfacing** (`q1.j`)
- Prior-coverage block, always.

---

### Prior-coverage block (shared)

**`br.prior.1`** — When did the earlier version run?
- `br.prior.1.a` — Within the last month
- `br.prior.1.b` — One to six months ago
- `br.prior.1.c` — Six to twelve months ago
- `br.prior.1.d` — One to three years ago
- `br.prior.1.e` — More than three years ago

**`br.prior.2`** — How did it end?
- `br.prior.2.a` — We responded and it was corrected or withdrawn
- `br.prior.2.b` — We responded, stood by our position, and it stood
- `br.prior.2.c` — We didn't respond and it faded
- `br.prior.2.d` — We didn't respond and it recurs periodically
- `br.prior.2.e` — It went to a regulator, adjudicator or legal process
- `br.prior.2.f` — It has never resolved
- `br.prior.2.g` — We don't know; nobody here was there

**`br.prior.3`** — Does our previous public position still hold?
- `br.prior.3.a` — Yes, unchanged
- `br.prior.3.b` — Yes, but the facts have moved since
- `br.prior.3.c` — No, our position has changed
- `br.prior.3.d` — We never took a public position

---

## 5. The response levels

Each level has a name, a one-line definition, and a "what this is not" line where confusion is likely.

**`level.1.name`** — Log and monitor
**`level.1.def`** — Record that you saw it and what you decided. Take no action.
**`level.1.not`** — This is not the same as ignoring it. The record is the difference.

**`level.2.name`** — Private reply
**`level.2.def`** — Respond directly to the originator only. Nothing public.

**`level.3.name`** — Holding line prepared
**`level.3.def`** — Write and approve a line. Release it only if asked. Nothing goes out unprompted.
**`level.3.not`** — Preparing a line is not deciding to use it. The point is that the decision to speak, if it comes, is not made under time pressure.

**`level.4.name`** — Reactive statement issued
**`level.4.def`** — A statement given to whoever asked, for publication.
**`level.4.not`** — "No comment" is also Level 4. It is Level 4 with the worst available wording: it appears in the piece and readers hear it as confirmation. If you are declining, say what you are declining and why.

**`level.5.name`** — Owned channels
**`level.5.def`** — You publish something yourself, on your own site or accounts.
**`level.5.not`** — Publishing to your own audience makes the issue visible to people who had not seen it. That is sometimes the point and sometimes the mistake.

**`level.6.name`** — Proactive outreach
**`level.6.def`** — You approach outlets or stakeholders who have not asked.

**`level.7.name`** — Escalate
**`level.7.def`** — Correction demand, regulator notification, or legal action.
**`level.7.not`** — This is not a communications decision on its own, and this tool cannot make it. It reaches Level 7 only where a rule requires it.

---

## 6. Output

**`out.heading`**
> Recommended: Level {n} — {level name}

**`out.reasoningHeading`**
> Why

**`out.axisSpeakingLabel`**
> Cost of speaking

**`out.axisQuietLabel`**
> Cost of staying quiet

**`out.axisBand`**
> {Low | Medium | High}

**`out.driversHeading`**
> What drove this

**`out.driverLine`**
> {answer text} — raised the cost of {speaking | staying quiet}

**`out.overrideHeading`**
> A rule applied here

**`out.overrideIntro`**
> This recommendation was set by a rule, not by the two scores. Rules exist because some situations are not trade-offs.

**`out.changeHeading`**
> What would change this

**`out.changeIntro`**
> Name what would make you look at this again. A decision recorded without one has no expiry date, and reactive decisions go stale faster than anything else in comms.

**`out.neighboursHeading`**
> The levels either side

**`out.neighboursIntro`**
> So you can argue with this rather than only accept it.

**`out.levelDown`**
> One level down would mean: {level def}. That is the right call if you think {axis} is overstated here.

**`out.levelUp`**
> One level up would mean: {level def}. That is the right call if you think {axis} is understated here.

**`out.checkYourselfHeading`**
> Worth separating

**`out.checkYourself`**
> The strongest pressure to respond here is internal rather than external. That is a real consideration, and it is a different one from the situation this assessment measures.

**`out.handoff`** — shown at Levels 3, 4, 5 and 6
> This level means something has to be written. The Comms Clarity Scorer checks a draft for buzzwords, hedging, passive voice and empty quotes, in your browser, with nothing uploaded. Nothing is passed between the two tools — you copy your own draft across.

**`out.noHandoff`** — shown at Levels 1 and 2
> Nothing needs writing for publication at this level. The record below is the output.

---

## 7. Rules and overrides

### Always-on

**`rule.safety`**
> **Someone's physical safety is involved.** This stops being a communications decision on its own. Involve the people who own safety in your organisation now, before anything is said or not said publicly. This rule cannot be switched off or reweighted in this tool's configuration, deliberately.

**`rule.data`**
> **Personal data may be involved.** Where a data breach has occurred, notification to the regulator and to affected individuals runs on its own clock and its own rules. Communications cannot run ahead of it, contradict it, or pre-empt it. Check with whoever owns data protection before responding.

**`rule.legal`**
> **Legal proceedings may be live or reasonably anticipated.** Public comment on the substance is constrained once that is true, regardless of how wrong you believe the other side to be. Check with legal before responding.

**`rule.employment`**
> **An employment matter may be involved.** A protected disclosure cannot be commented on, and any response that reads as retaliation becomes the story itself. The same applies to a live grievance or disciplinary process. Involve HR and legal before comms.

### Identifiability

**`rule.individualExternal`**
> **An individual outside the organisation is identifiable.** You almost certainly cannot address the specifics publicly without confirming information about them. A public reply here is capped at a general line: not a rebuttal that discusses their case.
>
> This applies even where you believe they are wrong. Being wrong does not remove their expectation of privacy, and this is the rule most often broken, because being wrong feels like it grants permission.

**`rule.individualInternal`**
> **An individual inside the organisation is identifiable.** Duty of care, employment law and data protection all apply before communications does. Route this to HR and legal first. Where a public line is needed, it is about process, never about the person.

### Other

**`rule.regulatorOriginator`**
> **A regulator or elected official raised this.** Silence is not available. The minimum is a private, acknowledged reply, made with legal or regulatory involved.

**`rule.deadlineNamed`**
> **There is a deadline you don't control and you are named.** Something is required by that deadline, even if it is only an acknowledgement. Silence becomes "declined to comment" in print, which is Level 4 with the worst possible wording.

**`rule.trueAndKnew`**
> **What has been said is accurate, and you knew.** Silence is not a defensible posture here. The question is no longer whether to say something, but when, in what forum, and to whom first.

**`rule.privateIndividualNote`** — a note, not a rule
> The originator appears to be a private individual with very little reach. Responding publicly does not only risk spreading this further. It also looks like a large organisation going after one person, and that is frequently the bigger story.

---

## 8. Sector rules

Each is a prompt to consult, never a decision. Every sector card ends with `sector.footer`.

**`sector.footer`**
> This is a prompt to consult the people who own this risk in your organisation. It is not a compliance decision and it is not legal advice.

**`sector.healthcare`** — Healthcare, pharma and life sciences
> Adverse event reporting runs on statutory deadlines that are not yours to move, and a safety signal is reported before it is communicated. Off-label discussion is constrained even in a reactive line. A patient may be identifiable from very little detail.

**`sector.financial`** — Financial services and listed companies
> A reactive line can itself be a disclosure event. Inside information, selective disclosure, quiet and closed periods, and the treatment of forward-looking statements all apply to what you say and to whom you say it first.

**`sector.tech`** — Technology and digital platforms
> Online safety duties, exposure and harm to minors, undisclosed automation or synthetic media, and automated decisions affecting users each carry their own obligations, and several require notification before or instead of public comment.

**`sector.ai`** — AI development and deployment
> Transparency and disclosure obligations apply to automated decision-making, and any statement about capability, accuracy or autonomy is a representation you may have to substantiate later.

**`sector.public`** — Public sector and publicly funded bodies
> Pre-election period restrictions constrain what can be said and when. Anything written internally about this may be disclosable under freedom of information. Clearance routes may sit above the communications timeline.

**`sector.education`** — Education and organisations working with minors
> Safeguarding takes precedence over reputation, without exception. No public comment may identify a child, including in a rebuttal, and including where the account being corrected identified them first.

**`sector.charity`** — Charity and not-for-profit
> Serious incident reporting to the regulator comes before responding, not after. Safeguarding, donor confidentiality and beneficiary confidentiality all constrain what can be said publicly.

**`sector.energy`** — Energy, environment and extractives
> Environmental claims face specific scrutiny and substantiation requirements. Incident notification and permit or licence conditions may impose their own deadlines, independent of any media timeline.

**`sector.food`** — Food, drink and consumer products
> A product recall or withdrawal follows its own procedure, and an allergen incident is a safety notice before it is a reputation question. The safety process outranks the communications one.

**`sector.transport`** — Transport, aviation and infrastructure
> Independent investigation bodies own the account of what caused an incident. No speculation on cause, however confident you are, and however long the investigation takes.

**`sector.none`** — General
> No sector-specific rules are active. The rules that always apply — safety, personal data, legal proceedings, employment — are still in force.

**Sectors not shipped.** Recorded in SPEC.md section F.6 with reasoning: gambling and alcohol; defence and national security; professional and financial services advisory. Any can be added as a config file without touching code.

**Regulator links.** Each sector config carries a `sourceUrl`. **These are not written in this file and must be verified as live before being added**, following the scorer's convention: a link's presence or absence is itself an honest signal of how sourced a statement is. Do not add a URL you have not checked resolves.

---

## 9. Glossary

Collapsed by default behind an expandable control, same pattern as the Comms Clarity Scorer's "Why this check exists" pill. Terms are dotted-underlined inline. Solid underline is reserved for external links and nothing else.

**`gloss.control.label`**
> What this means

**`gloss.panel.heading`**
> How this tool uses these words

### Who's who

**`gloss.you`** — **You** — The person running this check. Nothing you enter is stored or sent anywhere.

**`gloss.originator`** — **Originator** — Whoever first said the thing publicly: the journalist who called, the account that posted, the group that published. Not necessarily the person affected.

**`gloss.subject`** — **Subject** — Who or what the issue is about. Often, but not always, your organisation.

**`gloss.affectedParty`** — **Affected party** — Anyone who has actually experienced the thing being described. May be the originator, may be someone else, may be nobody.

**`gloss.amplifier`** — **Amplifier** — Anyone who has picked it up and carried it further than the originator could alone.

### What the tool measures

**`gloss.pulseCheck`** — **Pulse check** — A fast, structured read on a situation. It tells you something real and immediate. It is not a diagnosis. It does not replace the judgement of your communications or public affairs team, the specialists who own the risk — legal, compliance, regulatory — or the person who actually knows the facts. It does not replace your own escalation procedure. If your organisation has one, that procedure names who is accountable for this decision and who must be consulted before it is made. This tool does not know who those people are and cannot stand in for them.

**`gloss.costOfSpeaking`** — **Cost of speaking** — What a response spends: attention it draws, standing it gives the originator, and the length of time the issue stays live.

**`gloss.costOfStayingQuiet`** — **Cost of staying quiet** — What silence spends: inaccuracy left standing unchallenged, obligations unmet, and a decision you may not be able to account for later.

**`gloss.rule`** — **Rule** — A condition that decides the outcome regardless of the two scores. Rules exist because some situations are not trade-offs.

**`gloss.checkYourselfFlag`** — **Check-yourself flag** — A note, not a score. It appears when the assessment suggests the pressure to act is coming from inside the organisation rather than from the situation.

**`gloss.escalationTrigger`** — **Escalation trigger** — A condition you name now that would make you revisit this decision. "A national outlet picks it up." "The complainant goes to the regulator." A decision recorded without one has no expiry date, and reactive decisions go stale faster than anything else in comms.

### Terms that get confused

**`gloss.noComment`** — **"No comment"** — Not silence. It is Level 4 with the worst available wording: it appears in the piece, and readers hear it as confirmation. If you are declining, say what you are declining and why.

**`gloss.silence`** — **Silence** — Level 1 or 2. Nobody outside knows you considered it.

**`gloss.holdingLine`** — **Holding line** — A short, true, approved statement that buys time without committing to a position you might have to move off.

**`gloss.rightOfReply`** — **Right of reply** — An offer to comment before publication. Declining it does not stop publication; it removes your account from the piece.

**`gloss.oxygenOfAmplification`** — **Oxygen of amplification** — The finding that covering or responding to a fringe assertion can spread it further than leaving it alone. Source: Phillips, *The Oxygen of Amplification*, Data & Society, 2018.

*Sector terms — purdah, quiet period, adverse event, serious incident — are defined inside the sector rule that uses them, not here.*

*Glossary IDs `gloss.level1`, `gloss.level2`, `gloss.level3`, `gloss.level4`, `gloss.level5`, `gloss.level6` and `gloss.level7` (a "The response scale" category in `config.default.json`'s glossary, not reproduced here) reuse the `level.1.name`/`.def`/`.not` through `level.7.name`/`.def`/`.not` strings in section 5 verbatim.*

---

## 10. Export

**`exp.button.email`** — Copy for email
**`exp.button.slack`** — Copy for Slack
**`exp.button.print`** — Print or save as PDF

**`exp.intro`**
> The record below contains your answers, the recommendation, and the reasoning. It contains nothing you did not enter.

**`exp.nameHeading`**
> Who made this call

**`exp.nameIntro`**
> Optional. Leave blank if you're checking your own thinking rather than recording a decision. Nothing here is stored — it appears only in the copy you take away.

**`exp.field.firstName`** — First name
**`exp.field.lastName`** — Last name
**`exp.field.role`** — Role
**`exp.field.function`** — Function

**`exp.record.heading`**
> Reactive Pulse Check — {date}, {time}

**`exp.record.sections`**
> Recommended level / Cost of speaking / Cost of staying quiet / What you told us / Rules that applied / Worth separating / What would change this / Who made this call

**`exp.footer`**
> Produced with Reactive Pulse Check, a free tool for reactive communications. It runs entirely in the browser and stores nothing. reactive-pulse-check on GitHub.
>
> This is a pulse check, not a decision, and not legal advice. It does not replace communications or public affairs judgement, the specialists who own the risk, or your organisation's own escalation procedure.

---

## 11. Buttons, labels and states

**`ui.start`** — Start
**`ui.next`** — Next
**`ui.back`** — Back
**`ui.skip`** — Skip this question
**`ui.submit`** — Get the recommendation
**`ui.restart`** — Start again
**`ui.sectorLabel`** — Sector
**`ui.sectorDefault`** — General

**`ui.heading.questions`** — Questions
**`ui.heading.results`** — Your result
**`ui.heading.export`** — Copy and share

**`ui.restartConfirm`**
> Starting again clears your answers. Nothing was stored, so they can't be recovered.

**`state.incomplete`**
> Answer this to continue.

**`state.beforeStart`**
> Nothing has been entered yet.

**`state.configError`**
> The tool couldn't load its configuration file, so it can't run. If you're running this from your own computer, it needs to be served by a local web server rather than opened as a file. See the README.

**`aria.resultReady`**
> Assessment complete. Recommended level {n}, {level name}.

**`aria.progress`**
> Question {n} of {total}.

---

## 12. Not yet written

Flag rather than invent:

- Regulator `sourceUrl` values for the ten sector configs — must be verified live before use.
- README screenshot alt text, once a screenshot exists.
- Any string needed by a branch question not listed in section 4.
