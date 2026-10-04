// Responsibility: evaluating overrides against the given answers — safety
// (SPEC.md F.1), always-on regimes (F.2), individual identifiability (F.3),
// other overrides (F.4), and sector overrides from config (F.6) — and
// reporting when one has overridden the two-axis arithmetic entirely. Also
// computes the check-yourself flag, the Q9 legal cross-check, and the
// internal-audience note (SPEC.md section G, section E Q9, and section I.5),
// which are separate mechanisms from overrides but are, like overrides,
// read alongside the two scores rather than folded into them. The
// internal-audience note lives here rather than in scoring.js's noteId
// mechanism because it depends on the final level, which is only known once
// overrides have been resolved.
//
// Outcome levels, firing priority when more than one override fires, and
// which are inferred rather than given a literal number by SPEC.md, are
// all documented in SPEC.md F.7, not here — that is the source of truth
// for the behaviour this file implements, not this comment. The one
// exception is the safety override (F.1), which lives in this file as
// code per CLAUDE.md's config-not-code principle and cannot fire today,
// since no question asks about it yet.
//
// One outcome type, 'ceiling' (rule.confidentiality, SPEC.md F.2/F.7), does
// not take part in the "only one override decides" priority competition the
// other three outcome types (forced/floor/clamp) use. See applyCeilings()
// below for how and why it composes with that single winner instead.

window.PulseCheck = window.PulseCheck || {};

PulseCheck.Overrides = (function () {
  var SAFETY_OVERRIDE_ID = 'rule.safety';
  var SAFETY_OUTCOME = { type: 'forced', level: 7 };

  // Deliberately unreachable today: no question in config asks about
  // physical safety (SPEC.md F.1, CLAUDE.md). Kept as a real function,
  // not a stub, so the one hardcoded override in this file has a single
  // obvious place to grow into when that question is added.
  function safetyFired() {
    return false;
  }

  function applyOutcome(outcome, arithmeticLevel) {
    if (outcome.type === 'forced') return outcome.level;
    if (outcome.type === 'floor') return Math.max(arithmeticLevel, outcome.level);
    if (outcome.type === 'clamp') return Math.min(Math.max(arithmeticLevel, outcome.min), outcome.max);
    return arithmeticLevel;
  }

  // Config-driven override definitions: alwaysOnRegimes (F.2, F.3, F.4 —
  // not sector-specific, active regardless of which sector is selected)
  // and sectorOverrides (F.6). Both are id -> { outcome, priority }.
  function configuredOverrides(config) {
    var byId = {};
    (config.alwaysOnRegimes || []).forEach(function (entry) {
      if (entry && entry.id && entry.outcome) byId[entry.id] = entry;
    });
    (config.sectorOverrides || []).forEach(function (entry) {
      if (entry && entry.id && entry.outcome) byId[entry.id] = entry;
    });
    return byId;
  }

  // SPEC.md F.4/F.7: "a deadline exists and we are named" is a compound
  // condition — a tight external deadline (q7.a/q7.b) together with the
  // organisation being named (q2.a/q2.b) — that a single answer option's
  // triggersOverride cannot express on its own, so it is checked directly
  // against both answers here. br.journ.1.d is the one option that still
  // fires this override unconditionally via triggersOverride (see
  // SPEC.md F.7 for why that option is the exception).
  var TIGHT_DEADLINE_OPTION_IDS = { 'q7.a': true, 'q7.b': true };
  var NAMED_OPTION_IDS = { 'q2.a': true, 'q2.b': true };
  var DEADLINE_NAMED_OVERRIDE_ID = 'rule.deadlineNamed';

  function deadlineAndNamedFired(answers) {
    var q7 = (answers.q7 || [])[0];
    var q2 = (answers.q2 || [])[0];
    return !!(TIGHT_DEADLINE_OPTION_IDS[q7] && NAMED_OPTION_IDS[q2]);
  }

  // SPEC.md E/F.4: the affected-party floor is a three-way compound
  // condition — true and known internally (q3.a), the affected party
  // directly harmed (q8.c), and that same party already raising it
  // publicly themselves (q8.g) — same reason as deadlineAndNamedFired
  // above: no single option's triggersOverride can express an AND across
  // three answers (two of them on the same multi-select question) on its
  // own. q3 and q8 are both unconditional core questions (never hidden by
  // showIf), so reading answers.q3/answers.q8 directly here, without
  // routing through questionsOnPath, is safe the same way q2/q7 are above.
  var AFFECTED_PARTY_FLOOR_OVERRIDE_ID = 'rule.affectedPartyFloor';

  function affectedPartyFloorFired(answers) {
    var q3 = (answers.q3 || [])[0];
    var q8 = answers.q8 || [];
    return q3 === 'q3.a' && q8.indexOf('q8.c') !== -1 && q8.indexOf('q8.g') !== -1;
  }

  // Any answer option carrying triggersOverride, across every question
  // actually on the path (SPEC.md C.4), plus the one compound condition
  // above, resolved against the config-driven override definitions.
  // Priority: safety outranks everything (it is the only route to
  // Level 7); among the rest, lower "priority" in config wins (SPEC.md
  // F.7). Each override id fires at most once even if more than one
  // answer would trigger it.
  //
  // Path-scoped via PulseCheck.Scoring.questionsOnPath (see the
  // PATH-SCOPED comment in js/scoring.js): an option's triggersOverride
  // must not still fire from an answer Back-navigation has abandoned.
  function findFired(answers, config) {
    var oById = {};
    config.answerOptions.forEach(function (option) { oById[option.id] = option; });
    var overridesById = configuredOverrides(config);

    var fired = [];
    var firedIds = {};

    function pushOnce(id, sourceOptionId, outcome, priority) {
      if (firedIds[id]) return;
      firedIds[id] = true;
      fired.push({ id: id, sourceOptionId: sourceOptionId, outcome: outcome, priority: priority });
    }

    if (safetyFired(answers)) {
      pushOnce(SAFETY_OVERRIDE_ID, null, SAFETY_OUTCOME, -1);
    }

    PulseCheck.Scoring.questionsOnPath(config, answers).forEach(function (question) {
      (answers[question.id] || []).forEach(function (optionId) {
        var option = oById[optionId];
        var definition = option && option.triggersOverride ? overridesById[option.triggersOverride] : null;
        if (definition) {
          pushOnce(definition.id, optionId, definition.outcome, typeof definition.priority === 'number' ? definition.priority : 99);
        }
      });
    });

    if (deadlineAndNamedFired(answers) && overridesById[DEADLINE_NAMED_OVERRIDE_ID]) {
      var deadlineDefinition = overridesById[DEADLINE_NAMED_OVERRIDE_ID];
      pushOnce(deadlineDefinition.id, null, deadlineDefinition.outcome, typeof deadlineDefinition.priority === 'number' ? deadlineDefinition.priority : 99);
    }

    if (affectedPartyFloorFired(answers) && overridesById[AFFECTED_PARTY_FLOOR_OVERRIDE_ID]) {
      var affectedPartyDefinition = overridesById[AFFECTED_PARTY_FLOOR_OVERRIDE_ID];
      pushOnce(affectedPartyDefinition.id, null, affectedPartyDefinition.outcome, typeof affectedPartyDefinition.priority === 'number' ? affectedPartyDefinition.priority : 99);
    }

    fired.sort(function (a, b) { return a.priority - b.priority; });
    return fired;
  }

  // SPEC.md section G: raised by Q9 when a senior leader or the CEO is
  // pushing for a response. Never moves a score.
  function checkYourselfFlag(answers) {
    var q9 = answers.q9 || [];
    return q9.indexOf('q9.c') !== -1 || q9.indexOf('q9.d') !== -1;
  }

  // SPEC.md section E, Q9: where legal/compliance/regulatory raised it
  // (q9.e), the record cross-checks that against whether anything else in
  // the assessment routes there — an override having fired, or cost of
  // staying quiet being high.
  function legalCrossCheck(answers, scoringResult, firedOverrides) {
    var q9 = answers.q9 || [];
    if (q9.indexOf('q9.e') === -1) return null;

    var consistent = firedOverrides.length > 0 || (scoringResult.bands && scoringResult.bands.costOfStayingQuiet === 'high');
    return {
      consistent: consistent,
      overrideIds: firedOverrides.map(function (f) { return f.id; })
    };
  }

  // SPEC.md I.5: where employees are already discussing it (q8.a), the
  // ladder describes external response only — an internal audience already
  // discussing something usually needs addressing whatever the external
  // answer is. The firing rule is config.noteConditions
  // .internalAudienceNoteMaxLevel (CLAUDE.md config-not-code principle):
  // the note fires at finalLevel <= that value. Set to 7 (the top of the
  // scale) so it fires at every level.
  function internalAudienceNote(answers, finalLevel, config) {
    var q8 = answers.q8 || [];
    if (q8.indexOf('q8.a') === -1) return null;
    var maxLevel = config.noteConditions.internalAudienceNoteMaxLevel;
    if (typeof maxLevel !== 'number' || finalLevel > maxLevel) return null;
    return { noteId: 'rule.internalAudienceNote' };
  }

  // New note: fires where the final level is 3 and the originator has
  // asked for comment — either q1.a ("a journalist has contacted us")
  // directly, or any answer that fires rule.deadlineNamed (br.journ.1.d
  // unconditionally, or the compound q7/q2 condition in
  // deadlineAndNamedFired above). Reuses the already-computed `fired`
  // list for the second disjunct rather than re-deriving
  // deadlineAndNamedFired a second time — one definition of "did
  // rule.deadlineNamed fire", same reasoning as PATH-SCOPED in
  // js/scoring.js. Like internalAudienceNote below, this needs finalLevel,
  // which is only known once overrides have resolved, so it lives here
  // rather than in scoring.js's plain noteId mechanism.
  function alreadyAskedNote(answers, finalLevel, fired) {
    if (finalLevel !== 3) return null;
    var q1 = answers.q1 || [];
    var askedForComment = q1.indexOf('q1.a') !== -1
      || fired.some(function (f) { return f.id === DEADLINE_NAMED_OVERRIDE_ID; });
    if (!askedForComment) return null;
    return { noteId: 'rule.alreadyAskedNote' };
  }

  // SPEC.md F.7: professional confidentiality (`rule.confidentiality`) is a
  // fourth outcome kind, 'ceiling', that does not compete for priority the
  // way forced/floor/clamp do. Every other override's outcome is decided by
  // "only one override decides" (fired[0], by priority) — a ceiling instead
  // composes with whatever that single winner already produced: it is
  // applied afterwards, as an unconditional final cap, which is what lets it
  // pull a floor-type override's result back down ("a ceiling overrides a
  // floor"). applyOutcome() above has no branch for 'ceiling', so if a
  // ceiling override happens to be fired[0] itself (nothing else fired, or
  // it won priority outright), that call is a no-op and finalLevel is still
  // the bare arithmetic level at this point — exactly what the step below
  // needs to then cap. The one exception is rule.safety (F.1): it outranks
  // every other rule, hardcoded and un-editable, and a ceiling must never
  // pull a forced Level 7 back down.
  function applyCeilings(fired, applied, finalLevel) {
    var ceiling = fired.filter(function (f) { return f.outcome && f.outcome.type === 'ceiling'; })[0];
    if (!ceiling) return finalLevel;
    if (applied && applied.id === SAFETY_OVERRIDE_ID) return finalLevel;
    return Math.min(finalLevel, ceiling.outcome.level);
  }

  // SPEC.md C.1/F.7: whether any fired rule blocks the Level 6 gate. Only
  // rules that force or limit the level block it — forced, clamp and
  // ceiling outcomes (and rule.safety, which is forced). A floor never
  // does: it only stops the level going lower, so it says nothing about
  // whether escalation should be considered. Checked across every fired
  // rule, not just the single winner, because a ceiling (rule.confidentiality)
  // can fire alongside a higher-priority floor that wins the priority slot.
  function level6GateBlocked(fired) {
    return fired.some(function (f) { return !f.outcome || f.outcome.type !== 'floor'; });
  }

  function apply(answers, scoringResult, config) {
    if (scoringResult.configError) {
      return { fired: [], applied: null, finalLevel: null, level6GateBlocked: false, checkYourselfFlag: false, legalCrossCheck: null, internalAudienceNote: null, alreadyAskedNote: null };
    }

    var fired = findFired(answers, config);
    var applied = fired.length ? fired[0] : null;
    var finalLevel = applied ? applyOutcome(applied.outcome, scoringResult.level) : scoringResult.level;
    finalLevel = applyCeilings(fired, applied, finalLevel);

    return {
      fired: fired,
      applied: applied,
      finalLevel: finalLevel,
      level6GateBlocked: level6GateBlocked(fired),
      checkYourselfFlag: checkYourselfFlag(answers),
      legalCrossCheck: legalCrossCheck(answers, scoringResult, fired),
      internalAudienceNote: internalAudienceNote(answers, finalLevel, config),
      alreadyAskedNote: alreadyAskedNote(answers, finalLevel, fired)
    };
  }

  return { apply: apply };
})();
