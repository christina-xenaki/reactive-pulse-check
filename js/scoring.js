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

window.PulseCheck = window.PulseCheck || {};

PulseCheck.Scoring = (function () {
  var AXES = ['costOfSpeaking', 'costOfStayingQuiet'];

  // q1 and q9 route/record but never score (SPEC.md E, CLAUDE.md axis
  // weight matrix rule 2); q8 uses the capped multi-select formula (rule 3)
  // instead of a plain sum.
  var UNSCORED_QUESTION_IDS = { q1: true, q9: true };
  var CAPPED_MULTI_QUESTION_ID = 'q8';

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

  function questionsById(config) {
    var byId = {};
    config.questions.forEach(function (question) { byId[question.id] = question; });
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
  // maximum achievable on the path actually taken (SPEC.md C.1).
  function axisTotals(config, answers) {
    var qById = questionsById(config);
    var earned = { costOfSpeaking: 0, costOfStayingQuiet: 0 };
    var max = { costOfSpeaking: 0, costOfStayingQuiet: 0 };

    Object.keys(answers).forEach(function (questionId) {
      var question = qById[questionId];
      if (!question || UNSCORED_QUESTION_IDS[questionId]) return;

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
  // "what drove this" (SPEC.md I.3).
  function driversFor(config, answers, axis, limit) {
    var qById = questionsById(config);
    var oById = optionsById(config);
    var contributions = [];

    Object.keys(answers).forEach(function (questionId) {
      if (UNSCORED_QUESTION_IDS[questionId]) return;
      if (!qById[questionId]) return;
      (answers[questionId] || []).forEach(function (optionId) {
        var weight = weightFor(config, optionId, axis);
        if (weight > 0) {
          contributions.push({ optionId: optionId, text: oById[optionId] ? oById[optionId].text : optionId, weight: weight });
        }
      });
    });

    contributions.sort(function (a, b) { return b.weight - a.weight; });
    return contributions.slice(0, limit || 4);
  }

  // Every selected option (excluding q1/q9) on the path taken, for the
  // low-confidence caveat (SPEC.md C.3).
  function scoredSelections(config, answers) {
    var qById = questionsById(config);
    var selections = [];
    Object.keys(answers).forEach(function (questionId) {
      if (UNSCORED_QUESTION_IDS[questionId]) return;
      if (!qById[questionId]) return;
      (answers[questionId] || []).forEach(function (optionId) { selections.push(optionId); });
    });
    return selections;
  }

  function notesFor(config, answers) {
    var oById = optionsById(config);
    var notes = [];
    Object.keys(answers).forEach(function (questionId) {
      (answers[questionId] || []).forEach(function (optionId) {
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
    var lowConfidence = typeof lowConfidenceThreshold === 'number' && selections.length > 0
      ? (unknownCount / selections.length) * 100 > lowConfidenceThreshold
      : false;

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
    resolveLevel6Gate: resolveLevel6Gate
  };
})();
