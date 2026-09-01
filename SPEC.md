# Specification — Reactive Pulse Check

**Repo:** `reactive-pulse-check`
**On-page name:** Reactive Pulse Check
**Status:** specification agreed, not yet built

**Principle throughout:** every question, answer option, threshold, override and message lives in `config/config.json`, with one deliberate exception recorded in section F.1. The code contains no sector-specific content.

**Second principle, specific to this tool:** every input is a property of the *situation*, not of the *content*. The tool never asks what happened, and has nowhere to type it. Nobody should type "we think an employee leaked the redundancy plan" into a website.

---

## A. What the tool is

A structured decision aid for reactive communications: the space between routine media relations and full crisis response. It answers "should we say something, and if so at what level" with a recommendation, the reasoning that produced it, and what would change it.

**Register: pulse check.** A pulse tells you something real and immediate and nobody mistakes it for a diagnosis. This sets the tone of every string in the interface. The recommendation is stated plainly — hedging it into uselessness defeats the purpose — but it sits next to its reasoning and is followed by what would overturn it.

**Why it exists.** Most experienced practitioners know within thirty seconds whether to respond. What they cannot do quickly is defend that instinct to a panicking executive, apply it consistently at 11pm, or evidence it afterwards when someone asks why nothing was said. The gap is not judgement. It is that the judgement leaves no trace.

---

## B. The response scale

The output is a position on a seven-level scale, never a binary.

| Level | Name | Definition |
|---|---|---|
| 1 | Log and monitor | Record that you saw it and what you decided. Take no action. |
| 2 | Private reply | Respond directly to the originator only. Nothing public. |
| 3 | Holding line prepared | Write and approve a line. Release it only if asked. Nothing goes out unprompted. |
| 4 | Reactive statement issued | A statement given to whoever asked, for publication. |
| 5 | Owned channels | You publish something yourself, on your own site or accounts. |
| 6 | Proactive outreach | You approach outlets or stakeholders who have not asked. |
| 7 | Escalate | Correction demand, regulator notification, or legal action. Not a comms decision alone. |

**Terminology note.** "Level" throughout the interface and the export. "Rung" and "ladder" were the design-stage metaphor and do not appear in the product: "Level 3" survives into a document read by someone who was not in the room, and matches the escalation-matrix language people already meet in crisis manuals.

**"No comment" is not silence.** It is Level 4 with the worst available wording. It appears in the piece and readers hear it as confirmation. The tool separates these explicitly wherever a low level is recommended, because conflating them is the single most common error in this space.

---

## C. The two axes

Every scored answer adds points to one axis, the other, or both.

**Cost of speaking** — what a response spends: attention it draws, standing it gives the originator, and how long the issue stays live.

**Cost of staying quiet** — what silence spends: inaccuracy left standing unchallenged, obligations unmet, and a decision you may not be able to account for later.

Deliberately not framed as "risk." Both directions carry risk, and the word makes silence sound like the safe default when it frequently is not.

**Why two axes and not one total.** A single score averages two very different situations into the same mushy middle. Both low is a nothing situation: log it. Both high is a genuinely hard call: prepare everything and decide with the named functions in the room. Those must not produce the same output.

### C.1 Scoring model

Each axis produces a 0–100 score from the weighted answer options in `config/config.json`.

**Scores are normalised by the path taken.** Paths vary in length — a leak enquiry asks fewer branch questions than a prior-coverage block — so raw point totals are not comparable across paths. Each axis score is the percentage of the maximum achievable on the path actually taken: points earned on that axis by the questions actually asked, divided by the maximum those same questions could have contributed. Q1 carries no weight on either axis: its only job is to select which branch questions are asked, so it contributes nothing to either axis and nothing to either maximum.

**How a question's own contribution is worked out depends on its type.** Three formulas exist, all in `js/scoring.js`:

- **Single-select (max-of-single).** The question contributes the weight of whichever one option was chosen; the maximum it could have contributed is the highest weight among its options. Every single-choice question in the set uses this.
- **Plain multi-select (sum).** The question contributes the sum of the weights of every option selected; the maximum is the sum of every option's weight. Used by any multi-select question that does not carry `cappedMultiScoring` in config.
- **Capped multi-select.** Used where a plain sum would let the number of selections alone dominate the axis, regardless of how much any one of them actually adds. The question contributes the highest weight among the selected options, plus a per-question `increment` for each additional selection beyond the first; the maximum is the highest weight among *all* its options, plus a per-question `capBonus`. Both `increment` and `capBonus` are config values on the question (`config.questions[].cappedMultiScoring`), not hardcoded, so each capped question sets its own: `q8` ("who else has a stake") uses `increment: 2, capBonus: 4`; `q2b` ("is a named individual involved") uses the tighter `increment: 1, capBonus: 2`, because a second named individual adds constraint but not proportionally — the first individual named already carries most of the weight. `q2b` was, before this formula applied to it, the only question in the config normalised by the sum of *all* its options, which made it roughly 41% of the entire cost-of-speaking denominator from one question alone, deflating every score on every path where no individual was named (most paths select "no individual is named" at 0/0 on both axes and earn nothing from the question).

Each axis is then placed in a band. **Band thresholds are per-axis, not shared** (`config.bandBoundaries.costOfSpeaking`/`.costOfStayingQuiet`, each carrying its own `lowCeiling`/`mediumCeiling`):

- **Cost of speaking** — low below 35, medium up to 65, high above.
- **Cost of staying quiet** — low below 40, medium up to 65, high above.

**Why the two axes don't share one boundary.** 35/65 was originally applied to both axes identically, set symmetrically before any real score existed. The two axes have different distributions because their weights do: cost-of-speaking options cluster high, since many answers argue against speaking, while cost-of-quiet options spread wider. Applying identical boundaries to non-identical scales was an untested assumption. The cost-of-staying-quiet boundary has since been moved to 40 on the evidence of real scores from the regression scenarios — a calibration decision fitted to a small number of cases, not a general finding, and one that may move again as more scores are seen. Cost of speaking is unchanged.

The recommended level comes from the 3×3 matrix. Band boundaries and matrix cells are both config values.

| | **Speaking: low** | **Speaking: medium** | **Speaking: high** |
|---|---|---|---|
| **Quiet: low** | Level 1 | Level 1 | Level 1 |
| **Quiet: medium** | Level 4 | Level 3 | Level 2 |
| **Quiet: high** | Level 5 | Level 4 | Level 3, with everything prepared |

**Levels 6 and 7 are never reached by arithmetic.** Level 6 requires cost-of-quiet high, cost-of-speaking low, *and* a positive answer to a gating question: do we have something new and true to say that is not already public. **The gating question is not part of the question set.** It is asked only once the arithmetic has already landed on the level 6 cell, shown alongside the result rather than among Q1–Q9. Answering no gives Level 5 instead, with the reasoning for the drop shown alongside it. Level 7 is reachable only by override. A tool that arrives at "sue them" by adding up multiple-choice answers would be indefensible.

**Every recommendation is shown with its matrix position**, both scores, and the three or four answers that contributed most to each. The reasoning is the product; the level is the summary of it.

**Cap on cost of staying quiet where the organisation is not identifiable.** Where `q2.d` is selected ("our sector or a peer organisation only; we are not identifiable"), the cost-of-staying-quiet score is capped at `bandBoundaries.notIdentifiableQuietCap` (a config value, kept below cost-of-staying-quiet's own `lowCeiling` so the axis cannot leave the low band on this path) regardless of what the other answers produce. The core questions assume the issue is about us; on a sector or competitor path where nobody can tell it is us, the arithmetic would otherwise score the other organisation's reach as our own cost of silence, which is not what it costs us to stay quiet. Branch questions still apply beneath the cap — `br.sect.1.a` (a shared supplier, contractor or partner) can lift a shared-exposure case above `br.sect.1.d` (nothing beyond the sector) — only the ceiling is fixed.

**Fixed bug: "the path actually taken" was not actually enforced.** For a period after scoring and Back-navigation first coexisted, this paragraph already described the intended behaviour, but the code did not match it: an answer left behind after using Back to change an earlier answer (e.g. changing what kind of issue this is, after already answering that type's follow-up questions) kept being counted anyway — in the score, in the denominator the score was measured against, in the drivers list, and in the exported answer record — silently, alongside whatever the user actually went on to answer. This was not cosmetic: the percentage itself, and sometimes the recommended level, could be wrong as a result. It has been fixed; the mechanics are documented in code comments marked PATH-SCOPED, starting in `js/scoring.js`.

**The principle, in plain terms: only the path the user is currently on exists.** An answer to a question that is no longer on that path stops existing entirely — for scoring, for the denominator, for the drivers list, for the answer record, and for export. It isn't hidden, discounted, or kept in reserve in case the user goes back to it; it is gone. Switching back to a previously abandoned branch means answering it fresh — the tool never restores what was picked before. There is no memory of abandoned paths anywhere in the tool, and there shouldn't be: a record that quietly carried answers to questions the user never reached on the path they actually took would misrepresent the situation it's meant to reflect.

### C.2 Uncertainty

Not-knowing is scored by what it costs in that specific question, not by a blanket rule applied to every "unknown" answer. An unknown answer to "what do we know about whether what's been said is accurate" (`q3.f`) and an unknown answer to "does our previous public position still hold" (`br.prior.3`) do not cost the same thing, so each is weighted individually in `config/config.json`, like any other answer option. Where not-knowing carries a cost whichever way the situation turns out, both axes rise. Every answer that records an unknown also feeds "What would change this" (section I.8): finding out is itself an escalation trigger.

### C.3 Low-confidence caveat

Where more than `lowConfidenceThreshold` (a config value, default 40%) of the scored answers on the path taken are unknowns, the record carries a caveat: the assessment rests mostly on things not yet known, and is worth re-running once they are.

**`q3.f` fires the caveat regardless of proportion.** Not knowing whether what's been said is true (`q3.f`, "we cannot verify it yet") is not comparable to, say, not knowing our relationship with an outlet — averaging them into one proportional test understates the first. Any answer option carrying `forcesLowConfidence` (section C.4) trips the caveat on its own; the proportion threshold above still applies as well, and either condition is sufficient.

### C.4 Answer option properties

An answer option in `config/config.json` can carry three properties beyond its two axis weights:

- **`triggersOverride`** — the ID of the override (section F) this option fires when selected. Where present, the named override's outcome replaces the two-axis arithmetic entirely, and the record states that it did (section F, section I.4).
- **`noteId`** — the ID of a note in `COPY.md` to attach to the record's output (section I) when this option is selected, shown alongside the recommendation regardless of level.
- **`isUnknown`** — `true` where the option represents "we don't know yet" for that question. Counted, alongside every other scored answer on the path taken, toward the percentage behind the low-confidence caveat (C.3).
- **`forcesLowConfidence`** — `true` where selecting this option should raise the low-confidence caveat (C.3) on its own, regardless of what proportion of scored answers are unknowns. Set on `q3.f` only: not knowing whether the central claim is true is a different order of uncertainty from the other unknowns the proportional test averages it with.

All four are optional and independent: an option can carry any combination of them, or none.

### C.5 Shared exposure: a partner, supplier or client implicated

`q8.e` ("a partner, supplier or client is implicated") and `br.sect.1.a` ("a supplier, contractor or partner", the sector-incident branch's shared-exposure option) both carry `costOfStayingQuiet` 7.

When a shared supplier or partner is implicated, silence does not keep the organisation out of the story. It leaves the organisation inside a category — "others affected," "other parties named" — while whichever organisation was actually named differentiates itself with a response. The cost of staying quiet here is that someone else defines your position while you say nothing.

The previous weighting (`costOfStayingQuiet` 5 on `q8.e`, 6 on `br.sect.1.a`) was justified by a different and weaker argument: that failing to consult the third party carries a cost. That is a cost of not consulting, not a cost of public silence, and it has been replaced by the reasoning above.

---

## D. Controlled vocabulary

"Claim" is not used generically anywhere in the interface. In reactive communications it collides with two other meanings — a promotional claim in the regulated sense, and a legal claim — and a tool that asks "is the claim true?" reads to a regulatory or legal reader as though something quite specific is being assessed.

| Use | Not |
|---|---|
| **"What has been said"** — the neutral catch-all | "the claim" |
| **"Assertion"** — a single specific statement | "the claim" |
| **"Allegation"** — reserved for a statement of wrongdoing by a named party, never generic | — |
| **"Claim"** — only inside sector override text, in its regulatory sense, defined there | — |

---

## E. Question set

Nine core questions plus one conditional core question, then two to four branch questions selected by the trigger type. Budget: 90 seconds. Past that, people close the tab and go with their gut anyway.

**Answer options are written as full descriptive phrases, not terse labels.** They do double duty as interface copy and as the exported record: with no free text anywhere, the record's legibility to someone who was not in the room depends entirely on this.

### Core

**1. What kind of issue has been raised?** *(single choice; selects the branch set)*
- A journalist has contacted us
- A post or thread on social media
- A review, rating or complaint on a public platform
- A statement made by a competitor or rival organisation
- A campaign group, NGO or activist action
- A regulator, politician or public body has raised it
- Something that looks like an internal leak
- A rumour circulating privately, not yet published anywhere
- An incident at another organisation in our sector
- An old story about us resurfacing

Carries no weight on either axis. Its only job is to select which branch questions come next; the branch questions score.

**2. How directly is the organisation mentioned in this issue?** *(single choice)*
- Named directly, and we are the subject of it
- Named, but we are not the main subject
- Not named, but anyone in our sector would know it's us
- Our sector or a peer organisation only; we are not identifiable

**2b. Is a named individual involved?** *(multi-select; shown unless Q2 = sector only)*
- A board member or C-suite executive, in their organisational role
- A board member or C-suite executive, in a personal capacity
- A senior leader below board level
- An employee
- A contractor, agency or freelancer working for us
- A partner, supplier or client organisation
- A customer, patient or service user
- No individual is named

A separate question rather than a fifth option on Q2, because a named individual is not a further point on the same scale. It can be more severe than the organisation being named and it changes which overrides fire. The split between the first two options carries real weight: an executive named over a business decision is a corporate issue; the same executive named over personal conduct is a governance and personal-data issue that can move a share price, and it raises the individual override rather than scoring on the axes.

**"A senior leader below board level" raises `rule.individualInternal`, matching "an employee" and "a board member or C-suite executive, in a personal capacity."** The identifiability override was drafted with employees and service users as its two anchor cases, and a senior leader below board level fell between them by accident rather than by decision — the option existed but carried no override. It is an internal individual, so it gets the internal rule: holds at Level 2 or 3 and routes to HR and legal before comms, the same as the other two internal cases.

**3. What do we know about whether what's been said is accurate?** *(single choice)*
- True, and we knew
- True, and we did not know until now
- Partly true, but the central point is wrong
- False, but plausible enough that people will believe it
- False, and self-evidently so
- We cannot verify it yet

**4. How far has it travelled so far?** *(single choice)*
- Only the originator and we know about it
- A small audience has seen it; nobody else has picked it up
- An amplifier has picked it up: a trade or niche outlet
- An amplifier has picked it up: a national outlet or a large account
- It is already everywhere we look

**5. Which way is it moving?** *(single choice)*
- Growing quickly
- Growing slowly
- Flat
- Already fading
- Too early to tell; this is under an hour old

Retained despite correlating with Q4 and Q6, because "already fading" is the single answer that most often flips a recommendation, and without it the tool cannot distinguish a dying story from a starting one.

**6. Who is carrying it?** *(single choice)*
- Someone with real distribution — a journalist, a large account, a broadcaster
- An account with a committed audience but little reach beyond it
- An anonymous or very low-reach account
- An organised group running a planned campaign
- Nobody yet; we found this ourselves
- Staff, suppliers or people we work with, spreading it informally — no account, journalist or campaign behind it

The sixth option covers word-of-mouth carriers: an internal rumour spreading among staff or people we work with, with no identifiable external account, journalist or campaign behind it. Without it, an internal rumour had to be mapped to one of the external-carrier options or to "nobody yet," none of which describe it. Weighted `costOfSpeaking` 5, `costOfStayingQuiet` 5.

**7. Is there a deadline we don't control?** *(single choice)*
- Yes, publication in under four hours
- Yes, today
- Yes, within the next few days
- No external deadline

**8. Who else, beyond the originator, has a stake in this?** *(multi-select)*
- Employees are already discussing it
- A regulator has an interest in this subject
- Customers, patients or service users are directly affected
- Investors, funders or trustees will ask about it
- A partner, supplier or client is implicated
- Nobody beyond the originator yet

**9. Is there anyone in the organisation pushing for a response?** *(single choice, optional, skippable)*
- Nobody; we are assessing it ourselves
- The comms team
- A senior leader has seen it and wants something said
- The CEO or an equivalent has seen it and wants something said
- Legal, compliance or regulatory have raised it

Scores nothing on either axis. Produces the check-yourself flag (section G) when the answer is a senior leader or the CEO. Where the answer is `q9.e` — legal, compliance or regulatory — it does not raise the flag; instead the record cross-checks it against the rest of the assessment. If an override fired or cost of staying quiet is high, the record says legal's involvement is consistent with what the assessment found, and names the finding. If nothing else flagged, the record says the assessment found nothing that routes to legal, and that they may be working from something these questions did not ask about.

### Branches, by trigger type

**Journalist enquiry** — What have they asked for? (comment on a specific point / general background / confirmation of a fact / right of reply on something they intend to publish regardless). Do we have an existing relationship with this outlet? Then the prior-coverage block below, if a version has run before.

**Social post or thread** — Is the account one we can reply to privately? Has anyone from our organisation already replied publicly?

**Review or complaint** — Is this a service failure we can actually fix? Does the platform allow a public reply?

**Competitor statement** — Is it comparative advertising or a statement of fact about us? Is there a route other than public comment: trade body, direct approach, advertising regulator?

**Campaign group or NGO** — Is there a planned moment attached: an AGM, a report launch, a fixture? Have they approached us privately first?

**Regulator, politician or public body** — Is this a formal process with a deadline, or a public statement? Is there a channel obligation to respond privately?

**Apparent leak** — Is the underlying information accurate? Is it market-sensitive or personal data?

**Private rumour** — Has any journalist contacted us about it? Would responding be the first public confirmation it exists?

**Sector incident** — What do we share with them: supplier, practice, regulator, or nothing but the sector? Have we been asked about it, or are we anticipating?

**Old story resurfacing** — The prior-coverage block below, always.

### Prior-coverage block *(shared)*

Built once, used by both the journalist branch and the old-story branch.

**When did the earlier version run?** Within the last month / one to six months ago / six to twelve months ago / one to three years ago / more than three years ago

**How did it end?** We responded and it was corrected or withdrawn / we responded, stood by our position, and it stood / we didn't respond and it faded / we didn't respond and it recurs periodically / it went to a regulator, adjudicator or legal process / it has never resolved / we don't know, nobody here was there

**Does our previous public position still hold?** Yes, unchanged / yes, but the facts have moved since / no, our position has changed / we never took a public position

Two answers move the recommendation materially. "We didn't respond and it recurs" means silence has already been tested and failed, raising the cost of staying quiet. "Our position has changed" means any response is also a correction of your own record, raising the cost of speaking and routing to legal.

---

## F. Overrides

Conditions that decide the outcome regardless of both scores. Overrides exist because some situations are not trade-offs. Where one applies, the report says so explicitly, names it, and states that it beat the arithmetic.

### F.1 Safety — hardcoded, not configurable

Anyone's physical safety is implicated → fixed escalation, with the named functions.

**This override lives in the code, not in `config/config.json`. It cannot be edited, reweighted, or switched off.** Every other threshold in this tool and in the Comms Clarity Scorer is editable, which is the design principle of both. This is the one deliberate exception, and the documentation says so in those terms. An organisation that *can* turn off the safety override in a config file is an organisation where, eventually, someone will.

### F.2 Always-on regimes

Active whatever sector is selected, including General. Not editable. These are not sector-specific and requiring someone to select "Healthcare" before the tool will mention a personal data breach would be a design flaw.

1. **Personal data and breach notification** — regulator notification deadlines and separate notification to affected individuals. Communications cannot pre-empt, contradict, or run ahead of that notification. Applies to every organisation holding data about anyone.
2. **Active legal proceedings** — sub judice and contempt. Once proceedings are live or reasonably anticipated, public comment on the substance is constrained regardless of how wrong the other side is.
3. **Market-sensitive information leak** — where information that has leaked is market-sensitive, disclosure obligations decide what is said and when. That is not a comms judgement about reach and trajectory, so the recommendation holds and routes to legal and the company secretary before comms, until they have ruled.
4. **Employment and whistleblowing** — a protected disclosure cannot be commented on, and anything reading as retaliation becomes the story. Covers live grievance and disciplinary processes.

### F.3 Individual identifiability — two different situations

The design draft conflated these. They have different answers.

**An individual outside the organisation is identifiable** (a complainant, a patient, a customer, a social media user). You almost certainly cannot address specifics publicly without confirming information about them. Recommendation is capped at Level 2 plus a general public line: never a rebuttal discussing their case. **This applies even when they are wrong**, and it is the override people most often break, because being wrong feels like it grants permission.

**An individual inside the organisation is identifiable** (an employee, a senior leader below board level, a named executive in a personal capacity). Duty of care, employment law, and in most jurisdictions data protection. Holds at Level 2 or 3 and routes to HR and legal before comms. The public line is about process, never about the person.

### F.4 Other overrides

- **Regulator or elected official is the originator** → never Level 1. Minimum is a private, acknowledged reply, with legal or regulatory involved.
- **A deadline exists and we are named** → a response is required by that deadline even if it is only an acknowledgement. Silence becomes "declined to comment" in print, which is Level 4 with the worst possible wording.
- **True, and we knew** → silence is not available as a defensible posture. The question changes from whether to when and in what forum.

### F.5 Note, not a rule

Where the originator is a private individual with very little reach, responding publicly does not only risk amplification: it looks like a large organisation going after one person. Attached to the recommendation as a note. Deliberately not an override, because there are situations where it is wrong.

### F.6 Sector configs

Ten ship. Same pattern as the Comms Clarity Scorer: one file per sector, identical schema, each carrying `sectorName`, override text, and `sourceUrl` pointing at the actual regulator or code.

| Sector | Override it carries |
|---|---|
| Healthcare, pharma and life sciences | Adverse event reporting deadlines; off-label promotion; patient identifiability. A safety signal is reported before it is communicated. |
| Financial services and listed companies | Inside information and selective disclosure; quiet and closed periods; forward-looking statements. A reactive line can itself be a disclosure event. |
| Technology and digital platforms | Online safety duties; minors' exposure and harm; undisclosed automation or synthetic media; algorithmic decisions affecting users. |
| AI development and deployment | Transparency and disclosure obligations; automated decision-making; representations about capability, accuracy or autonomy. |
| Public sector and publicly funded bodies | Pre-election period restrictions; FOI exposure of anything written internally; ministerial or departmental clearance routes. |
| Education and organisations working with minors | Safeguarding takes precedence over reputation. No public comment identifying a child, ever, including in rebuttal. |
| Charity and not-for-profit | Serious incident reporting to the regulator; safeguarding; donor and beneficiary confidentiality. Reporting comes before responding. |
| Energy, environment and extractives | Green claims scrutiny; environmental incident notification; permit and licence conditions. |
| Food, drink and consumer products | Product recall and withdrawal procedure; allergen incidents. A safety notice is not a comms decision and outranks the reputation question. |
| Transport, aviation and infrastructure | Independent investigation bodies own the cause narrative. No speculation on cause, however confident you are. |

**Footnote — three sectors deliberately not shipped.** Considered and left out of the initial ten, recorded here because each is a genuine regime a real organisation would need, and because building one is the clearest demonstration that the config pattern works:

- **Gambling and alcohol** — advertising content restrictions, affordability and harm messaging, age-gating of any public response.
- **Defence and national security** — clearance routes, classification, and prior-notification obligations that sit above any comms timeline.
- **Professional and financial services advisory** — client confidentiality and conflicts. Frequently the answer is that the organisation cannot confirm the client relationship exists, which changes the response question entirely.

Any of these can be added as `config/config.<name>.json` without touching code. This footnote is repeated in SCORING.md, aimed at someone building their own.

### F.7 Implementation: outcome levels, firing priority and configuration

Every override's outcome and firing priority is a config value, in `config.alwaysOnRegimes` for F.2/F.3/F.4 and `config.sectorOverrides` for F.6, read by `js/overrides.js`. The one exception is F.1 safety, which stays hardcoded in that file per F.1 above — the one deliberate departure from this document's config-not-code principle, and it cannot fire yet, since no question in the current question set asks about physical safety.

**Outcome levels.** Two are given a literal number above: F.1 safety is a forced Level 7 (the only route to it), and F.3's external-identifiability case is a forced Level 2 ("capped at Level 2"). F.3's internal case is given an explicit range ("Holds at Level 2 or 3"). The rest are not given a literal number above and were inferred by analogy at implementation time; recording the inference here keeps it visible rather than buried in a code comment.

| Override | Outcome | Basis |
|---|---|---|
| `rule.safety` | Forced Level 7 | Explicit — F.1, "fixed escalation"; Level 7 is reachable only by override (C.1) |
| `rule.individualExternal` | Forced Level 2 | Explicit — F.3, "capped at Level 2" |
| `rule.individualInternal` | Clamped to Level 2 or 3 | Explicit — F.3, "Holds at Level 2 or 3" |
| `rule.data` | Clamped to Level 2 or 3 | Inferred by analogy to `rule.individualInternal`: both route to a specialist function before public comment ("check with whoever owns data protection before responding") |
| `rule.legal` | Clamped to Level 2 or 3 | Inferred by analogy to `rule.individualInternal`, same reasoning ("check with legal before responding") |
| `rule.marketSensitive` | Clamped to Level 2 or 3 | Inferred by analogy to `rule.legal`/`rule.data`, same reasoning: disclosure obligations, not a comms judgement about reach and trajectory, decide what is said and when — routes to legal and the company secretary before comms, until they have ruled |
| `rule.employment` | Clamped to Level 2 or 3 | Inferred by analogy to `rule.individualInternal`, same reasoning ("Involve HR and legal before comms") |
| `rule.regulatorOriginator` | Floored at Level 2 | Explicit — F.4, "never Level 1. Minimum is a private, acknowledged reply" (Level 2, Private reply) |
| `rule.deadlineNamed` | Floored at Level 2 | Inferred: F.4 says a response is required "even if it is only an acknowledgement," read as the minimal non-silence response (Level 2); no literal number is given |
| `rule.trueAndKnew` | Floored at Level 2 | Inferred: F.4 says "silence is not available as a defensible posture," read as the same Level 2 floor as the other two F.4 rules, by analogy; no literal number is given |

**Firing priority.** Where more than one override fires on the same path, only one decides the outcome. Priority, highest first: `rule.safety` (hardcoded, checked before any config-driven override — it is the only route to Level 7) → `rule.individualExternal` → `rule.individualInternal` → `rule.data` → `rule.legal` → `rule.marketSensitive` → `rule.employment` → `rule.regulatorOriginator` → `rule.deadlineNamed` → `rule.trueAndKnew`. This order is a design decision, not stated elsewhere in this document: safety outranks everything; the two identifiability rules protect a third party regardless of what else is going on, so they come next; the specialist-routing regimes (data, legal, marketSensitive, employment) come before the floor-only "silence is not available" rules, which are the least restrictive of the ten. `rule.marketSensitive` sits beside `rule.legal` in that group rather than ahead of or behind it — both route to a specialist function before public comment, and no scenario has yet required deciding which of the two should win when both would otherwise fire on the same path.

**`rule.deadlineNamed` firing condition.** F.4 states this fires on "a deadline exists and we are named" — a compound condition, not a single answer. The implementation fires it when (`q7.a` or `q7.b` is selected) **and** (`q2.a` or `q2.b` is selected), checked directly against both answers rather than via one option's `triggersOverride`, because that property fires unconditionally on a single option and cannot express a compound condition. The one exception is `br.journ.1.d` ("right of reply on something they intend to publish regardless"), which carries `triggersOverride` and fires unconditionally: a right-of-reply request already establishes both legs of the condition on its own — a deadline, from the outlet's intent to publish regardless, and being named, since the request is made to us specifically.

**Two deferred decisions, now settled.** Two answer options were flagged as override candidates while the axis weights were being decided — `br.leak.2.a` ("market-sensitive" information in an apparent leak) and `br.prior.3.c` ("our position has changed" in the prior-coverage block).

`br.leak.2.a` is now an override: it triggers `rule.marketSensitive` (F.2, F.7 above). Where material non-public information has leaked, disclosure obligations decide what is said and when. That is not a comms judgement about reach and trajectory, and the tool should not imply otherwise by producing a level from arithmetic.

`br.prior.3.c` stays on weights alone, deliberately. It was considered as an override and left out: a changed public position is a genuine comms judgement — sometimes the right thing to say — and an override would remove that decision from the user. Its `costOfSpeaking` weight of 8, and the routing to legal already present elsewhere in the prior-coverage block (`br.prior.2.e` → `rule.legal`), already carry it. Recorded here as a decision, not a gap, so neither is rediscovered as an open question later.

---

## G. The check-yourself flag

A note, never a score. Produced by Q9 when the answer is a senior leader or the CEO.

> The strongest pressure to respond here is internal rather than external. That is a real consideration, and it is a different one from the situation this assessment measures.

**Copy shown under Q9, before the user answers (option B, selected):**

> This question does not score. It is here because "a senior leader wants something said" is a real consideration, and it is not the one this assessment measures. Recording it separately means the decision can be explained later on the grounds it was actually made.

Three alternates were drafted and are recorded so the choice is not lost. **A (neutral):** *"This question does not score. Internal pressure to respond and external risk are different things, and they can look identical when you are in the middle of one. Recording which is which keeps them separate."* **C (professional):** *"This question does not score. Where the pressure to respond is coming from is a legitimate input to your decision. It is a separate input from the situation itself, and this assessment only measures the situation."* **D (short):** *"This question does not score. It records where the pressure to respond is coming from, because that is a different question from whether the situation warrants one."*

---

## H. Glossary

Expandable definitions, same control pattern as the scorer's "Why this check exists": a real `<button>`, `aria-expanded`, `aria-controls`, keyboard-operable, collapsed by default, chevron respecting `prefers-reduced-motion`. Terms are dotted-underlined inline. A full glossary panel sits at the bottom of the page so the whole ruleset can be read before answering anything.

Solid underline remains reserved for real links, matching the scorer.

### Who's who

| Term | Definition |
|---|---|
| **You** | The person running this check. Nothing you enter is stored or sent anywhere. |
| **Originator** | Whoever first said the thing publicly: the journalist who called, the account that posted, the group that published. Not necessarily the person affected. |
| **Subject** | Who or what the issue is about. Often, but not always, your organisation. |
| **Affected party** | Anyone who has actually experienced the thing being described. May be the originator, may be someone else, may be nobody. |
| **Amplifier** | Anyone who has picked it up and carried it further than the originator could alone. |

### What the tool measures

| Term | Definition |
|---|---|
| **Pulse check** | A fast, structured read on a situation. It tells you something real and immediate. It is not a diagnosis. It does not replace the judgement of your communications or public affairs team, the specialists who own the risk — legal, compliance, regulatory — or the person who actually knows the facts. It does not replace your own escalation procedure. If your organisation has one, that procedure names who is accountable for this decision and who must be consulted before it is made. This tool does not know who those people are and cannot stand in for them. |
| **Cost of speaking** | What a response spends: attention it draws, standing it gives the originator, and the length of time the issue stays live. |
| **Cost of staying quiet** | What silence spends: inaccuracy left standing unchallenged, obligations unmet, and a decision you may not be able to account for later. |
| **Override** | A condition that decides the outcome regardless of the two scores. Overrides exist because some situations are not trade-offs. |
| **Check-yourself flag** | A note, not a score. It appears when the assessment suggests the pressure to act is coming from inside rather than from the situation. |
| **Escalation trigger** | A condition you name now that would make you revisit this decision. "A national outlet picks it up." "The complainant goes to the regulator." A decision recorded without one has no expiry date, and reactive decisions go stale faster than anything else in comms. |

RACI language is deliberately avoided: precise to the people who use it, meaningless to everyone else, and "accountable" and "consulted" carry the load without it.

### Terms that get confused

| Term | Definition |
|---|---|
| **"No comment"** | Not silence. It is Level 4 with the worst available wording: it appears in the piece, and readers hear it as confirmation. If you are declining, say what you are declining and why. |
| **Silence** | Level 1 or 2. Nobody outside knows you considered it. |
| **Holding line** | A short, true, approved statement that buys time without committing to a position you might have to move off. |
| **Right of reply** | An offer to comment before publication. Declining it does not stop publication; it removes your account from the piece. |
| **Oxygen of amplification** | The finding that covering or responding to a fringe assertion can spread it further than leaving it alone. Source: Phillips, *The Oxygen of Amplification*, Data & Society, 2018. |

Sector-specific terms — purdah, quiet period, adverse event, serious incident — are defined inside the override that uses them, not in the general glossary.

### The response scale

All seven levels from section B, defined in full. The output is meaningless without them.

---

## I. Output

1. **Recommended level**, stated plainly, with its name. Where the arithmetic lands on level 6, the gating question (section C.1) and its answer are shown alongside it; a "no" is shown as having produced level 5, with that reasoning stated.
2. **The two scores and the matrix position** that produced it.
3. **What drove each score**, grouped by axis (cost of speaking, cost of staying quiet, each group headed with the axis name in full) — the three or four answers contributing most to each, shown together with the question that produced them. A bare answer fragment ("Flat") is not readable on its own; "Which way is it moving? Flat" is. The same grouped, question-and-answer treatment applies to this block wherever it appears, including the export (section J), where the reader may have no memory of the questions at all.
4. **Any override that applied**, named. Where it changed the recommendation, the record says so and states what it requires. Where it fired but made no difference — the arithmetic already satisfied it, whether that means already meeting or exceeding a floor (an upward rule) or already sitting at or below a cap (a downward rule) — the record says that instead, with wording matched to which kind of rule it was: a floor still requires a minimum even where already met; a cap constrains a maximum even where already clear of it. A rule that made no difference is not the same event as a rule that overrode the scores, and reporting it with the same "this beat the arithmetic" wording would claim a change that didn't happen.
5. **Any notes attached by the answers given** (`noteId`, section C.4), in their own block immediately under the recommendation. Separate from item 4, which is for overrides that beat the arithmetic, and from item 6, which is for the check-yourself flag: a note is neither of those, and rendering it inside either block would misstate what produced it. One note is conditional on the final level rather than on the answer alone: where employees are already discussing it (`q8.a`), the record attaches the internal-audience note (`rule.internalAudienceNote`) whenever the final level is at or below `noteConditions.internalAudienceNoteMaxLevel` (a config value, currently 7 — the top of the scale — so the note fires at every level). It is computed in `js/overrides.js`, alongside the check-yourself flag and the Q9 legal cross-check, because it needs the final level, which is only known once overrides have been resolved. This condition was previously hardcoded in `js/overrides.js` as a Level 1/2 restriction; it has been moved into config so it is a threshold like any other (CLAUDE.md's config-not-code principle), and widened to fire at every level — a reactive statement to a journalist still leaves staff speculating, and that was the case (scenario 6, an internal rumour landing at level 3) the note was written for but previously missed.
6. **The check-yourself flag**, if raised.
7. **The Q9 legal cross-check**, where `q9.e` was selected (section E, Q9).
8. **The low-confidence caveat**, where more than `lowConfidenceThreshold` of scored answers on the path taken were unknowns (section C.3).
9. **What would change this** — the escalation triggers, drawn from the answers given.
10. **What the level below and the level above would mean**, so the recommendation can be argued with rather than only accepted.
11. **The handoff**, where the level is 3, 4, 5 or 6: a link to the Comms Clarity Scorer for the line, statement or post now needing to be written.

---

## J. Export

Export-only. Nothing persists after the session. Same treatment as the scorer: a distribution channel, not an afterthought.

- **Copy for email** (rich text) and **Copy for Slack** (plain text)
- **Print stylesheet**, which gives PDF export free
- **Structure:** timestamp → recommended level → the two scores → the inputs, in full descriptive phrasing → overrides applied → notes → check-yourself flag → escalation triggers → decision-maker → disclaimer and tool URL
- **Decision-maker fields** (first name, last name, role, function) appear only at the export or copy step, never in the tool itself. **All optional.** Someone doing a genuine sanity check before taking it to their director should not have to put a name to it, and forcing it would push people to skip the export entirely.

---

## K. Privacy note

**Agreed wording.** The scorer's section M does not carry over verbatim, because these are different tools: that wording is about pasted text (*"you can safely paste a draft that hasn't been published yet"*) and this tool has no text box. What carries over is the promise, not the sentence. Reproducing the sentence unchanged would be copy that does not describe the product.

> This runs in your browser, on your device. Your answers are never uploaded anywhere and nothing is stored after you close the page. There is no server and no account, so an assessment of something sensitive leaves no trace here.

The verifiability claim from the scorer's README carries over unchanged in substance: the only network requests the page makes are loading its own config file and the interface font.

---

## L. Disclaimer

Covers: a pulse check, not a diagnosis; does not replace communications or public affairs judgement, legal, compliance, regulatory, or the person who knows the facts; does not replace your organisation's own escalation procedure; sector overrides are a prompt to consult the function that owns that risk, never a compliance decision; tuned for UK and EU regulatory context, and the specific regimes named will differ elsewhere; **a recommendation to stay at Level 1 is not a guarantee that an issue will not grow.**

---

## M. Accessibility — WCAG 2.2 AA, stated in README

Matching the scorer exactly.

- Semantic HTML, correct heading hierarchy
- Every question a real fieldset with a real legend; every option a real labelled input
- Glossary controls reachable and operable by keyboard, not hover alone
- Tap to expand — hover does not exist on touchscreens
- Result announced via `aria-live` when the assessment completes
- Contrast at least 4.5:1 throughout
- Meaning never carried by colour alone
- Visible focus indicators; `prefers-reduced-motion` respected
- Progress through the question set announced, not only shown

---

## N. Layout — mobile-first

Single column, one question group per view, with a visible progress indicator.

**This reverses the Comms Clarity Scorer's layout decision, on purpose.** That tool is desktop-optimised and mobile-intact, because editing a press release is something you do sitting down. This one is genuinely mobile-first: reactive comms happen on a phone, in a taxi, at 9pm. The 90-second budget is only real if the tool works one-handed. A wide screen gets more breathing room and the glossary panel alongside rather than below, but nothing about the flow changes.

Same typeface and palette as the Comms Clarity Scorer, so the two read as one family.

---

## O. Relationship to the Comms Clarity Scorer

**A workflow handoff, not shared code.** Levels 3 to 6 all end with something needing to be written, which is exactly what the scorer takes as input. The pulse check's output links to it. **No data passes between the tools** — the user copies their own draft across. Passing text through a URL would break the scorer's privacy note, which is the one thing neither tool can afford.

**Shared conventions, not shared engines.** One parses text, one evaluates a decision tree; forcing shared code would be artificial. Identical across both: the privacy principle, config separate from code, the expandable-explanation control, export and print approach, MIT licence, WCAG 2.2 AA, British English, and the sourcing convention where a link's presence or absence is itself an honest signal of how sourced a claim is.

**Sector vocabulary — deliberately not aligned.** The scorer ships Healthcare, Environmental claims, AI and Forward-looking statements; this tool ships ten. The lists overlap but are not synchronised, because the two tools do different jobs: the scorer's sectors select a list of *words that draw scrutiny in a piece of writing*, while this tool's sectors select a *regulatory regime that constrains a decision*. Forcing one shared list would mean either shipping sectors with nothing behind them, or holding one tool back for the other. Where a sector appears in both, the label should match.

**Deliberately not built:** a combined landing page or a "suite." It invites a judgement about whether the set is complete, which it is not, and makes each repo look like a fragment rather than a finished thing.

---

## PARKED — do not build yet

**JSON export and re-import**, to revisit an assessment when the situation moves. Records live in a file the user owns and re-uploads; the tool still stores nothing. Two things need designing first:

1. Whether reopening a record re-runs the current ruleset or preserves the original one. A recommendation that silently changes because someone edited a config file is worse than no record at all.
2. How a re-run displays what shifted and why.

Escalation triggers only fully earn their keep once this exists. Until then they are recorded and exported, which is still useful.

**Optional free-text context toggle.** Off by default, with the benefits and drawbacks stated at the toggle itself and a privacy warning. The drawback to state plainly: free text makes the record readable by someone who was not there, and makes it discoverable.

**Local storage as a third mode.** Only if the JSON route proves too much friction in practice. "Never leaves your device" and "stored on your device" are different claims, and the second needs a clear-all button and honest copy about what a shared machine means.
