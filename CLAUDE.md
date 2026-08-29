# CLAUDE.md

Guidance for Claude Code (and any other agent) working in this repository.

**Read `SPEC.md` before doing anything else.** It is the design document
and the authority on what this tool does and why. This file must never
contradict it; if something here appears to conflict with `SPEC.md`,
`SPEC.md` wins and this file is wrong and should be fixed.

## What this is

Reactive Pulse Check is a browser-based structured decision aid for
reactive communications: it takes a set of answers about a situation and
produces a recommended response level, the reasoning behind it, and an
exportable record.

There is no code yet. This file defines how it is to be built.

## Code practices and conventions

- **Plain HTML, CSS and JavaScript.** No framework, no bundler, no build
  step, no ES modules. Plain `<script>` and `<link>` tags only.
- **Directory layout by kind, then by responsibility.** JavaScript in
  `js/`, CSS in `css/`, config in `config/`. Within each, split into
  modules by responsibility (e.g. scoring, question rendering, export,
  overrides) rather than one large file per kind.
- **Config, not code, for content.** Every question, answer option,
  threshold, scoring weight, override and piece of sector-specific
  content lives in config, never hardcoded in JavaScript — with the one
  exception below.
- **Config is JSON, loaded by `fetch`.** This means the tool cannot run
  from a `file://` URL and needs a local web server even for offline use.
  The README must say this plainly (e.g. "run a local server, such as
  `python3 -m http.server`, and open it over `http://`") rather than
  implying the tool runs by double-clicking a downloaded file.
- **The one exception: the physical safety override (SPEC.md section
  F.1).** It lives in the code and must never be moved into a config
  file, made editable, reweighted, or switched off. When implementing it,
  preserve a comment at the point of implementation stating that this is
  deliberate and pointing at SPEC.md F.1 — an organisation that *can* turn
  off the safety override in a config file is an organisation where,
  eventually, someone will.
- **All user-facing strings come from `COPY.md`, verbatim.** `COPY.md`
  does not exist yet. Until it does, do not invent interface copy: leave a
  clearly marked placeholder (e.g. `[[COPY NEEDED: short description]]`)
  in its place, and list every placeholder introduced at the end of your
  response.
- **String values live in config; `textId` is provenance, not a runtime
  lookup.** This tool has no build step, so nothing can read `COPY.md` at
  runtime — it is markdown, not data the page fetches. Every question,
  option, help text and glossary entry therefore carries its actual text
  as a plain string value in `config/config.default.json`, copied
  verbatim from `COPY.md`. Where a config entry also carries a `textId`
  (or `helpTextId`), that field is a pointer recording which `COPY.md`
  string the value came from, for auditing drift between the two files —
  it is never dereferenced at runtime. Do not "fix" a hardcoded string
  sitting next to a `textId` by trying to look it up dynamically; that
  is the intended pattern, not a shortcut taken under time pressure.
  Where a config entry's `id` already matches its `COPY.md` ID, the `id`
  is itself the provenance pointer and no separate `textId` field is
  needed — this is why answer options, glossary entries and `uiCopy`
  entries correctly carry no `textId`. A `textId` (or `helpTextId`) is
  added only where the `id` and the `COPY.md` ID differ, as they do for
  core questions (e.g. question `id` `q1`, `COPY.md` ID `q1.text`).
- **No free-text input, anywhere, ever.** The tool never asks what the
  issue is and has no field for describing it. Do not add a text field —
  including a "notes" field, an "other, please specify" option, or
  anything similar — for any reason. This is a deliberate design
  constraint (SPEC.md, second principle), not an oversight to be
  corrected.
- **No analytics, no third-party scripts, no network requests** other
  than the tool loading its own files (config JSON and any local font
  asset). Nothing calls out to a server, a CDN, or an analytics endpoint.
- **Accessibility to WCAG 2.2 AA is a requirement, not an enhancement.**
  See SPEC.md section M for specifics (real fieldsets and legends,
  keyboard-operable glossary controls, `aria-live` results, 4.5:1
  contrast, visible focus indicators, `prefers-reduced-motion`, progress
  announced not just shown).
- **Underline convention.** A solid underline means an external link and
  nothing else. Non-solid underlines (e.g. dotted) distinguish other
  categories, such as glossary terms. No meaning is ever carried by
  colour alone.
- **Mobile-first layout.** Single column, one question group per view,
  with a visible progress indicator. This is a deliberate reversal of the
  Comms Clarity Scorer's desktop-first layout (SPEC.md section N) —
  reactive comms happen on a phone. Do not default to a desktop-first
  build and adapt down.
- **British English throughout,** in code comments that contain prose,
  documentation, and of course any placeholder or real copy.
- **Tone follows `COPY.md`** once it exists. Until then, do not guess at
  tone beyond the register SPEC.md section A describes ("pulse check,"
  not a diagnosis).
- **Claude Code may add missing IDs to `COPY.md`, but must never add or
  alter wording there.** If config references a string, or invents an ID
  for one, that has no home in `COPY.md`, add the ID at the point the
  wording already lives (or, if the wording doesn't exist yet, flag the
  gap per the placeholder convention above). Wording gaps are always
  flagged to the user instead of being filled in.

## Standing instructions for every session

- **Work on a branch, never on `main`.** Create a branch named for the
  session's purpose (e.g. `session-2-question-set`), commit to it, and
  open a pull request describing what changed and what a reviewer should
  check. Do not merge it yourself.
- **Update documentation in the same commit as the change that affects
  it.** `README.md`, `SCORING.md` and `SPEC.md` must never describe
  behaviour the code no longer has. If a change makes one of them
  inaccurate, fix it before committing, not after.
- **Decision logic and interface are separate sessions.** Changes to the
  decision logic (questions, weights, the scoring matrix, overrides) and
  changes to the interface (layout, styling, interaction) are made in
  separate sessions. Do not mix the two in one session, even if it would
  be more convenient.
- **Verify no unintended drift in the decision logic.** After any change
  that was not deliberately a change to the decision logic, verify that
  the same set of answers still produces the same recommended level, the
  same two scores, and the same overrides as before the change. State in
  your response that you have verified this, and say which test inputs
  you used.
- **List every file touched.** At the end of any session that adds or
  moves files, list every file created or changed and confirm that each
  reference to it (from other code, config, or documentation) resolves.
- **Starting-state check.** Every prompt in this project begins with the
  state the repo is expected to be in. Before doing anything else, verify
  that state. If any part of it does not match what you find, stop,
  report exactly what differs, and make no changes until the requester
  confirms how to proceed. Never adapt the work to fit a repo state that
  was not described.
- **Pull requests.** I merge every pull request manually on GitHub. Before
  starting any session,fetch and check whether main has moved since your last
  branch. If it has,start a fresh branch from current main rather than continuing
  an existing one.
- **Icons.** If a button carries an icon, the icon is decorative
  (`aria-hidden="true"`, `focusable="false"`) and the visible text label
  always stays. Never an icon-only button and never a shortened label to
  make an icon fit. Inline SVG only: no icon library, no icon font, no
  CDN, no build step. A third-party logo appears only on a button that
  targets that service, unmodified in shape, never recoloured.
- **Documentation viewer.** Every markdown file in the repo renders
  through the same renderer and the same stylesheet. Which files appear
  in the navigation is a separate curation decision from how they
  render.
- **Never invent a value.** If a threshold, weight, question, answer
  option or user-facing string is needed and is not in SPEC.md or
  COPY.md, do not write a plausible one. Leave a clearly marked
  placeholder and list it at the end of the session.

## Key facts from SPEC.md worth keeping in view

- Output is a position on a **seven-level scale** (Log and monitor ...
  Escalate), never a binary — see SPEC.md section B.
- Two independent 0–100 axes, **cost of speaking** and **cost of staying
  quiet**, each banded low/medium/high, combined via a 3×3 matrix.
  **Levels 6 and 7 are never reached by arithmetic** — see SPEC.md
  section C.
- "Claim" is a controlled term — see SPEC.md section D for the vocabulary
  table before writing any copy that touches truth or accuracy.
- Overrides (safety, always-on regimes, individual identifiability,
  others) can override both scores entirely and must be reported as
  having done so — see SPEC.md section F.
- Export is the whole point of the "record" half of this tool: copy for
  email, copy for Slack, print stylesheet, decision-maker fields optional
  and collected only at export — see SPEC.md section J.
- Nothing the tool does is worth building ahead of what SPEC.md section
  **PARKED** explicitly defers: JSON export/re-import, a free-text toggle,
  and local storage are not to be built yet.
