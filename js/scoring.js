// Responsibility: computing the two independent axes — cost of speaking and
// cost of staying quiet (SPEC.md section C) — from the given answers using
// config's axisWeights, banding each via bandBoundaries, and mapping the
// band pair to a recommended level via levelMatrix. Levels 6 and 7 are never
// reached by this arithmetic — they come from overrides.js, and Level 6 also
// requires the post-scoring gating question (SPEC.md C.1), asked by the
// interface once compute() reports level6Eligible.
//
// Every threshold and weight this module reads comes from config
// (axisWeights, bandBoundaries, levelMatrix) — nothing here is hardcoded.
//
// Two config-driven exceptions to the plain arithmetic, both SPEC.md C.1/C.3:
// where q2.d (not identifiable) is selected, cost of staying quiet is capped
// at config.bandBoundaries.notIdentifiableQuietCap so it cannot leave the low
// band on that path; and any selected option carrying forcesLowConfidence
// (SPEC.md C.4) forces the low-confidence caveat regardless of the usual
// proportion threshold.

window.PulseCheck = window.PulseCheck || {};

PulseCheck.Scoring = (function () {
  var AXES = ['costOfSpeaking', 'costOfStayingQuiet'];

  // q1 and q9 route/record but never score (SPEC.md E, CLAUDE.md axis
  // weight matrix rule 2); q8 uses the capped multi-select formula (rule 3)
  // instead of a plain sum.
  var UNSCORED_QUESTION_IDS = { q1: true, q9: true };
  var CAPPED_MULTI_QUESTION_ID = 'q8';

  // --- Path scoping -----------------------------------------------------
  //
  // PATH-SCOPED: this is the one shared definition of "questions on the
  // current path". Back-navigation can leave answers behind for questions
  // that are no longer reachable — e.g. switching q1 from "journalist" to
  // "social media" after already answering the journalist branch's
  // follow-up questions. The tool's principle is that only the path the
  // user is currently on exists: an answer to a question no longer on that
  // path stops counting everywhere it could be read — scoring (both the
  // earned points and the maximum they're normalised against), drivers,
  // the low-confidence count, the answer record, notes, overrides. Every
  // one of those must be computed from questionsOnPath()'s result (or from
  // an answers object questions.js has already pruned to match it), never
  // by iterating Object.keys(answers) or config.questions directly. Do not
  // reintroduce a second walk of answers/config.questions elsewhere — call
  // this function instead, so there is exactly one definition to keep
  // correct (previously this logic was duplicated, uselessly, in
  // js/questions.js, which is why it drifted from what scoring needed).
  //
  // Conditions are evaluated against pathAnswers — answers built up
  // left-to-right as each question is confirmed on-path — rather than the
  // raw, possibly-stale answers object. This matters for chained
  // conditions: if br.journ.3 is no longer reachable because q1 no longer
  // routes through the journalist branch, a leftover br.journ.3 answer
  // must not still be read by br.prior's showIf, which depends on it.
  //
  // History (SPEC.md C.1 records this too, in plain terms, without the
  // specifics below): before this fix, axisTotals(), driversFor() and
  // scoredSelections() here, findFired() in js/overrides.js, and
  // buildAnswerRecord() in js/render.js all read Object.keys(answers) or
  // config.questions directly. An answer left behind by Back-navigation
  // (e.g. switching q1's branch after already answering that branch's
  // follow-up questions) kept scoring, kept feeding the drivers list and
  // the low-confidence count, and kept appearing in the exported answer
  // record — inflating both the earned points and the maximum they were
  // normalised against, so the percentage itself (and sometimes the
  // recommended level) could be wrong, not just cosmetically off. The fix
  // is this function, plus questions.js discarding an answer as soon as
  // its question falls off the path (see recomputeVisible() there) rather
  // than merely filtering it out at scoring/render time.
  function evaluateCondition(cond, pathAnswers) {
    if (!cond) return true;
    if (cond.any) return cond.any.some(function (c) { return evaluateCondition(c, pathAnswers); });
    if (cond.all) return cond.all.every(function (c) { return evaluateCondition(c, pathAnswers); });
    var selected = pathAnswers[cond.questionId] || [];
    if (cond.in) return cond.in.some(function (id) { return selected.indexOf(id) !== -1; });
    if (cond.notIn) return cond.notIn.every(function (id) { return selected.indexOf(id) === -1; });
    return true;
  }

  function questionsOnPath(config, answers) {
    var onPath = [];
    var pathAnswers = {};
    (config.questions || []).forEach(function (question) {
      if (!evaluateCondition(question.showIf, pathAnswers)) return;
      onPath.push(question);
      if (answers[question.id]) pathAnswers[question.id] = answers[question.id];
    });
    return onPath;
  }

  function isConfigValid(config) {
    if (!config) return false;
    var aw = config.axisWeights, bb = config.bandBoundaries, lm = config.levelMatrix;
    if (!aw || typeof aw !== 'object' || Object.keys(aw).length === 0) return false;
    if (!bb || typeof bb.bandLowCeiling !== 'number' || typeof bb.bandMediumCeiling !== 'number') return false;
    if (!Array.isArray(lm) || lm.length === 0) return false;
    return true;
  }

  function optionsById(config) {
    var byId = {};
    config.answerOptions.forEach(function (option) { byId[option.id] = option; });
    return byId;
  }

  function weightFor(config, optionId, axis) {
    var entry = config.axisWeights[optionId];
    return entry ? (entry[axis] || 0) : 0;
  }

  // Rule 3: highest single selection on the axis, plus 2 per additional
  // selection, capped at the question's highest single option value on
  // that axis plus 4.
  function cappedMultiScore(config, question, selectedIds, axis) {
    var allOptionValues = optionsById(config);
    var questionOptionIds = config.answerOptions
      .filter(function (o) { return o.questionId === question.id; })
      .map(function (o) { return o.id; });
    var highestPossible = questionOptionIds.reduce(function (max, id) {
      return Math.max(max, weightFor(config, id, axis));
    }, 0);
    var cap = highestPossible + 4;

    if (!selectedIds.length) return { earned: 0, max: cap };

    var selectedValues = selectedIds.map(function (id) { return weightFor(config, id, axis); });
    var highestSelected = Math.max.apply(null, selectedValues);
    var raw = highestSelected + 2 * (selectedIds.length - 1);
    return { earned: Math.min(raw, cap), max: cap };
  }

  // Sums each axis contribution question by question, normalised by the
  // maximum achievable on the path actually taken (SPEC.md C.1). Both the
  // earned total and the max it's divided by come from questionsOnPath()
  // — see the PATH-SCOPED comment above — so a question Back-navigation
  // has made unreachable contributes to neither.
  function axisTotals(config, answers) {
    var earned = { costOfSpeaking: 0, costOfStayingQuiet: 0 };
    var max = { costOfSpeaking: 0, costOfStayingQuiet: 0 };

    questionsOnPath(config, answers).forEach(function (question) {
      var questionId = question.id;
      if (UNSCORED_QUESTION_IDS[questionId]) return;

      var selected = answers[questionId] || [];
      var questionOptionIds = config.answerOptions
        .filter(function (o) { return o.questionId === questionId; })
        .map(function (o) { return o.id; });

      AXES.forEach(function (axis) {
        if (questionId === CAPPED_MULTI_QUESTION_ID) {
          var capped = cappedMultiScore(config, question, selected, axis);
          earned[axis] += capped.earned;
          max[axis] += capped.max;
        } else if (question.type === 'multi') {
          var sum = selected.reduce(function (total, id) { return total + weightFor(config, id, axis); }, 0);
          var maxSum = questionOptionIds.reduce(function (total, id) { return total + weightFor(config, id, axis); }, 0);
          earned[axis] += sum;
          max[axis] += maxSum;
        } else {
          var chosen = selected[0];
          if (chosen) earned[axis] += weightFor(config, chosen, axis);
          var maxSingle = questionOptionIds.reduce(function (m, id) { return Math.max(m, weightFor(config, id, axis)); }, 0);
          max[axis] += maxSingle;
        }
      });
    });

    return { earned: earned, max: max };
  }

  function bandFor(score, bandBoundaries) {
    if (score < bandBoundaries.bandLowCeiling) return 'low';
    if (score <= bandBoundaries.bandMediumCeiling) return 'medium';
    return 'high';
  }

  function matrixLevel(levelMatrix, speakingBand, quietBand) {
    var cell = levelMatrix.filter(function (row) {
      return row.speakingBand === speakingBand && row.quietBand === quietBand;
    })[0];
    return cell || null;
  }

  // Every selected option (excluding q1/q9, which never score) that
  // contributes to the given axis, ranked highest weight first, for
  // "what drove this" (SPEC.md I.3). Each contribution carries its
  // question's text alongside the answer's, so the driver reads as a
  // question-and-answer pair rather than a bare answer fragment (task
  // instruction: "Which way is it moving? Flat", not "Flat"). Path-scoped:
  // see the PATH-SCOPED comment above questionsOnPath().
  function driversFor(config, answers, axis, limit) {
    var oById = optionsById(config);
    var contributions = [];

    questionsOnPath(config, answers).forEach(function (question) {
      if (UNSCORED_QUESTION_IDS[question.id]) return;
      (answers[question.id] || []).forEach(function (optionId) {
        var weight = weightFor(config, optionId, axis);
        if (weight > 0) {
          contributions.push({
            optionId: optionId,
            text: oById[optionId] ? oById[optionId].text : optionId,
            questionText: question.text,
            weight: weight
          });
        }
      });
    });

    contributions.sort(function (a, b) { return b.weight - a.weight; });
    return contributions.slice(0, limit || 4);
  }

  // Every selected option (excluding q1/q9) on the path taken, for the
  // low-confidence caveat (SPEC.md C.3). Path-scoped: see the PATH-SCOPED
  // comment above questionsOnPath() — this is also what feeds the unknown
  // count behind that caveat, so the caveat itself is path-scoped for free.
  function scoredSelections(config, answers) {
    var selections = [];
    questionsOnPath(config, answers).forEach(function (question) {
      if (UNSCORED_QUESTION_IDS[question.id]) return;
      (answers[question.id] || []).forEach(function (optionId) { selections.push(optionId); });
    });
    return selections;
  }

  // Path-scoped for the same reason as scoredSelections() above: a note
  // tied to an answer Back-navigation has abandoned must not still appear
  // in the record.
  function notesFor(config, answers) {
    var oById = optionsById(config);
    var notes = [];
    questionsOnPath(config, answers).forEach(function (question) {
      (answers[question.id] || []).forEach(function (optionId) {
        var option = oById[optionId];
        if (option && option.noteId) notes.push({ optionId: optionId, noteId: option.noteId });
      });
    });
    return notes;
  }

  function compute(answers, config) {
    if (!isConfigValid(config)) {
      return { configError: true };
    }

    var oById = optionsById(config);
    var totals = axisTotals(config, answers);

    var scores = {};
    var bands = {};
    AXES.forEach(function (axis) {
      var score = totals.max[axis] > 0 ? Math.round((totals.earned[axis] / totals.max[axis]) * 100) : 0;
      scores[axis] = score;
      bands[axis] = bandFor(score, config.bandBoundaries);
    });

    // SPEC.md C.1: the core questions assume the issue is about us. On a
    // sector or competitor path where we are not identifiable (q2.d), the
    // arithmetic scores the other organisation's reach as our cost of
    // staying quiet, so that axis is capped in the low band regardless of
    // what the other answers produce. Branch questions still apply beneath
    // the cap.
    var notIdentifiable = (answers.q2 || [])[0] === 'q2.d';
    var quietCap = config.bandBoundaries.notIdentifiableQuietCap;
    if (notIdentifiable && typeof quietCap === 'number') {
      scores.costOfStayingQuiet = Math.min(scores.costOfStayingQuiet, quietCap);
      bands.costOfStayingQuiet = bandFor(scores.costOfStayingQuiet, config.bandBoundaries);
    }

    var cell = matrixLevel(config.levelMatrix, bands.costOfSpeaking, bands.costOfStayingQuiet);
    var level = cell ? cell.level : null;
    var level6Eligible = bands.costOfSpeaking === 'low' && bands.costOfStayingQuiet === 'high';

    var selections = scoredSelections(config, answers);
    var unknownSelections = selections
      .filter(function (id) {
        var option = oById[id];
        return option && option.isUnknown === true;
      })
      .map(function (id) { return { optionId: id, text: oById[id].text }; });
    var unknownCount = unknownSelections.length;
    var lowConfidenceThreshold = config.bandBoundaries.lowConfidenceThreshold;
    var lowConfidenceByProportion = typeof lowConfidenceThreshold === 'number' && selections.length > 0
      ? (unknownCount / selections.length) * 100 > lowConfidenceThreshold
      : false;
    // SPEC.md C.3: not knowing whether the central claim is true (q3.f) is
    // not comparable to the other unknowns the proportional test averages
    // it with, so any option carrying forcesLowConfidence trips the caveat
    // on its own, alongside the existing proportion threshold.
    var lowConfidenceForced = selections.some(function (id) {
      var option = oById[id];
      return option && option.forcesLowConfidence === true;
    });
    var lowConfidence = lowConfidenceByProportion || lowConfidenceForced;

    return {
      configError: false,
      scores: scores,
      bands: bands,
      level: level,
      matrixCell: cell,
      level6Eligible: level6Eligible,
      drivers: {
        costOfSpeaking: driversFor(config, answers, 'costOfSpeaking'),
        costOfStayingQuiet: driversFor(config, answers, 'costOfStayingQuiet')
      },
      notes: notesFor(config, answers),
      // Every unknown answer is itself an escalation trigger — it feeds
      // "What would change this" (SPEC.md I.8) as well as the
      // low-confidence caveat (C.3).
      unknownSelections: unknownSelections,
      unknownCount: unknownCount,
      scoredAnswerCount: selections.length,
      lowConfidence: lowConfidence
    };
  }

  // SPEC.md C.1: answering "no" to the gating question drops a level-6-
  // eligible result back to Level 5, with the reasoning shown alongside it.
  function resolveLevel6Gate(hasSomethingNewAndTrue) {
    return hasSomethingNewAndTrue ? 6 : 5;
  }

  return {
    isConfigValid: isConfigValid,
    compute: compute,
    resolveLevel6Gate: resolveLevel6Gate,
    // Exposed so questions.js (path/navigation state) and overrides.js and
    // render.js (which also read answers by question) share this one
    // definition rather than recomputing it — see the PATH-SCOPED comment
    // above questionsOnPath().
    questionsOnPath: questionsOnPath
  };
})();
