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

  // SPEC.md I.5: where employees are already discussing it (q8.a) and the
  // recommendation lands at Level 1 or 2, the ladder describes external
  // response only — an internal audience already discussing something
  // usually needs addressing whatever the external answer is.
  function internalAudienceNote(answers, finalLevel) {
    var q8 = answers.q8 || [];
    if (q8.indexOf('q8.a') === -1) return null;
    if (finalLevel !== 1 && finalLevel !== 2) return null;
    return { noteId: 'rule.internalAudienceNote' };
  }

  function apply(answers, scoringResult, config) {
    if (scoringResult.configError) {
      return { fired: [], applied: null, finalLevel: null, checkYourselfFlag: false, legalCrossCheck: null, internalAudienceNote: null };
    }

    var fired = findFired(answers, config);
    var applied = fired.length ? fired[0] : null;
    var finalLevel = applied ? applyOutcome(applied.outcome, scoringResult.level) : scoringResult.level;

    return {
      fired: fired,
      applied: applied,
      finalLevel: finalLevel,
      checkYourselfFlag: checkYourselfFlag(answers),
      legalCrossCheck: legalCrossCheck(answers, scoringResult, fired),
      internalAudienceNote: internalAudienceNote(answers, finalLevel)
    };
  }

  return { apply: apply };
})();
