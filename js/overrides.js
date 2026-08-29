// Responsibility: evaluating overrides against the given answers — safety
// (SPEC.md F.1), always-on regimes (F.2), individual identifiability (F.3),
// other overrides (F.4), and sector overrides from config (F.6) — and
// reporting when one has overridden the two-axis arithmetic entirely. Also
// computes the check-yourself flag and the Q9 legal cross-check (SPEC.md
// section G and section E, Q9), which are separate mechanisms from
// overrides but are, like overrides, read alongside the two scores rather
// than folded into them.
//
// CLAUDE.md: every override lives in config, never hardcoded in
// JavaScript, with one deliberate exception. The safety override (F.1) is
// that exception — it lives in this file as code and must never be moved
// into a config file, made editable, reweighted or switched off, see
// SPEC.md F.1 for why. No question in the current config asks about
// physical safety yet, so this check cannot fire today; the function below
// and this comment are the deliberate, non-configurable place it will hook
// in once that question exists. Every other override (F.2, F.3, F.4)
// reads its outcome from config.alwaysOnRegimes, and F.6 sector overrides
// read from config.sectorOverrides — neither's outcome levels are
// hardcoded here.

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

  // Any answer option carrying triggersOverride, across every question
  // actually on the path (SPEC.md C.4), resolved against the config-driven
  // override definitions above. Priority: safety outranks everything (it
  // is the only route to Level 7); among the rest, lower "priority" in
  // config wins. This ordering is a documented design decision — SPEC.md
  // does not itself state what happens when more than one override fires
  // on the same path.
  function findFired(answers, config) {
    var oById = {};
    config.answerOptions.forEach(function (option) { oById[option.id] = option; });
    var overridesById = configuredOverrides(config);

    var fired = [];

    if (safetyFired(answers)) {
      fired.push({ id: SAFETY_OVERRIDE_ID, sourceOptionId: null, outcome: SAFETY_OUTCOME, priority: -1 });
    }

    Object.keys(answers).forEach(function (questionId) {
      (answers[questionId] || []).forEach(function (optionId) {
        var option = oById[optionId];
        var definition = option && option.triggersOverride ? overridesById[option.triggersOverride] : null;
        if (definition) {
          fired.push({
            id: definition.id,
            sourceOptionId: optionId,
            outcome: definition.outcome,
            priority: typeof definition.priority === 'number' ? definition.priority : 99
          });
        }
      });
    });

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

  function apply(answers, scoringResult, config) {
    if (scoringResult.configError) {
      return { fired: [], applied: null, finalLevel: null, checkYourselfFlag: false, legalCrossCheck: null };
    }

    var fired = findFired(answers, config);
    var applied = fired.length ? fired[0] : null;
    var finalLevel = applied ? applyOutcome(applied.outcome, scoringResult.level) : scoringResult.level;

    return {
      fired: fired,
      applied: applied,
      finalLevel: finalLevel,
      checkYourselfFlag: checkYourselfFlag(answers),
      legalCrossCheck: legalCrossCheck(answers, scoringResult, fired)
    };
  }

  return { apply: apply };
})();
