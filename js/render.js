// Responsibility: rendering the results region (SPEC.md section I) —
// recommended level, the two scores and matrix position, what drove each
// score, any override applied, the check-yourself flag, escalation
// triggers, and the level-below/level-above explanation. Updates the
// aria-live results region so the outcome is announced.
//
// This module changes no decision logic: it only reads the objects
// PulseCheck.Scoring.compute() and PulseCheck.Overrides.apply() already
// produce, and the Level 6 gate answer feeds back into
// PulseCheck.Scoring.resolveLevel6Gate() (js/scoring.js), never into new
// arithmetic here.
//
// Every user-facing string comes from config.uiCopy / config.glossary /
// config.alwaysOnRegimes[].text / config.notes, copied verbatim from
// COPY.md by the config-authoring session — nothing here is hardcoded
// English, with the one documented exception below for rule.safety.

window.PulseCheck = window.PulseCheck || {};

PulseCheck.Render = (function () {
  var Dom = PulseCheck.Dom;
  var config = null;

  // SPEC.md F.1 / CLAUDE.md: the safety override is hardcoded in
  // js/overrides.js and deliberately cannot live in config — it cannot be
  // edited, reweighted or switched off. Its display copy is kept here,
  // in code, for the same reason, rather than added to config.default.json:
  // moving it to config would make it look editable even though it isn't.
  // It cannot fire today (js/overrides.js safetyFired() always returns
  // false, since no question asks about physical safety), so this path is
  // exercised only by direct test, never by a real answer set.
  var SAFETY_OVERRIDE = {
    id: 'rule.safety',
    renderTemplate: 'upward',
    leadIn: "someone's physical safety is involved",
    text: "Someone's physical safety is involved. This stops being a communications decision on its own. Involve the people who own safety in your organisation now, before anything is said or not said publicly. This rule cannot be switched off or reweighted in this tool's configuration, deliberately."
  };

  var formEl = null;
  var resultsEl = null;
  var latest = null; // { answers, scoring, overrides } from the most recent pulsecheck:result event
  var gateAnswer = null; // true/false once the Level 6 gate has been answered, else null

  function init(cfg) {
    config = cfg;
    formEl = document.getElementById('pulse-check-form');
    resultsEl = document.getElementById('results');
    if (!formEl) return;
    formEl.addEventListener('pulsecheck:result', function (event) {
      latest = event.detail;
      gateAnswer = null;
      renderAll();
    });
  }

  function uiText(id) {
    return (config.uiCopy && config.uiCopy[id]) || '';
  }

  function fillTemplate(template, values) {
    if (!template) return '';
    return Object.keys(values || {}).reduce(function (text, key) {
      return text.split('{' + key + '}').join(values[key] == null ? '' : String(values[key]));
    }, template);
  }

  // SPEC.md section H footnote / COPY.md section 9: gloss.level1..gloss.level7
  // carry "Level n — Name" as term, plus definition and, for most levels, a
  // "not" line. This is the one place level names/descriptions live in
  // config, so render.js reads them from there rather than duplicating them
  // in a second "levels" structure.
  function levelInfo(n) {
    var entry = (config.glossary || []).filter(function (g) { return g.id === 'gloss.level' + n; })[0];
    if (!entry) return { number: n, name: '', def: '', not: null, label: 'Level ' + n };
    var parts = entry.term.split(' — ');
    var name = parts.length > 1 ? parts.slice(1).join(' — ') : '';
    return { number: n, name: name, def: entry.definition, not: entry.not || null, label: entry.term };
  }

  function questionsById() {
    var byId = {};
    (config.questions || []).forEach(function (q) { byId[q.id] = q; });
    return byId;
  }

  function optionsById() {
    var byId = {};
    (config.answerOptions || []).forEach(function (o) { byId[o.id] = o; });
    return byId;
  }

  function overrideDefinitionFor(id) {
    if (id === SAFETY_OVERRIDE.id) return SAFETY_OVERRIDE;
    return (config.alwaysOnRegimes || []).concat(config.sectorOverrides || [])
      .filter(function (entry) { return entry.id === id; })[0] || null;
  }

  function noteTextFor(noteId) {
    return (config.notes && config.notes[noteId]) || '';
  }

  // --- Level 6 gate -------------------------------------------------------
  //
  // SPEC.md C.1: this question is never part of Q1–Q9. It is asked only
  // once compute() reports level6Eligible, shown alongside the result, and
  // answering it never re-runs the two-axis arithmetic — it only decides
  // whether Level 5 (the arithmetic cell for this band pair) or Level 6
  // applies, via PulseCheck.Scoring.resolveLevel6Gate().
  function gateApplicable(scoring, overrides) {
    return !overrides.applied && scoring.level6Eligible === true;
  }

  function buildGateControl() {
    var fieldset = Dom.el('fieldset', { className: 'level6-gate' });
    var legend = Dom.el('legend', {}, [document.createTextNode(uiText('out.level6Gate'))]);
    fieldset.appendChild(legend);

    ['yes', 'no'].forEach(function (value) {
      var id = 'level6-gate-' + value;
      var input = Dom.el('input', { type: 'radio', name: 'level6-gate', id: id, value: value });
      input.addEventListener('change', function () {
        gateAnswer = value === 'yes';
        renderAll();
      });
      var label = Dom.el('label', { for: id }, [document.createTextNode(uiText(value === 'yes' ? 'ui.yes' : 'ui.no'))]);
      var wrapper = Dom.el('div', { className: 'question-option' }, [input, label]);
      fieldset.appendChild(wrapper);
    });

    return fieldset;
  }

  // --- The matrix -----------------------------------------------------------

  var BANDS = ['low', 'medium', 'high'];

  function cellFor(levelMatrix, speakingBand, quietBand) {
    return (levelMatrix || []).filter(function (row) {
      return row.speakingBand === speakingBand && row.quietBand === quietBand;
    })[0] || null;
  }

  // The matrix always marks the cell the arithmetic reached, annotated where
  // a rule or the Level 6 gate has moved the recommendation elsewhere — the
  // matrix is a record of what the two scores said, not of the final call
  // (task instruction: "the matrix still shows the cell the arithmetic
  // reached, annotated").
  function buildMatrix(scoring, overridden) {
    var table = Dom.el('table', { className: 'result-matrix' });
    var caption = Dom.el('caption', {}, [document.createTextNode(uiText('out.axisSpeakingLabel') + ' / ' + uiText('out.axisQuietLabel'))]);
    table.appendChild(caption);

    var thead = Dom.el('thead');
    var headRow = Dom.el('tr', {}, [Dom.el('th', { scope: 'col' }, [document.createTextNode('')])]);
    BANDS.forEach(function (band) {
      headRow.appendChild(Dom.el('th', { scope: 'col' }, [document.createTextNode(bandLabel(band))]));
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    var tbody = Dom.el('tbody');
    BANDS.forEach(function (quietBand) {
      var row = Dom.el('tr', {}, [Dom.el('th', { scope: 'row' }, [document.createTextNode(bandLabel(quietBand))])]);
      BANDS.forEach(function (speakingBand) {
        var cell = cellFor(config.levelMatrix, speakingBand, quietBand);
        var isCurrent = scoring.bands && scoring.bands.costOfSpeaking === speakingBand && scoring.bands.costOfStayingQuiet === quietBand;
        var info = cell ? levelInfo(cell.level) : null;
        var td = Dom.el('td', isCurrent ? { className: 'result-matrix-current', 'aria-current': 'true' } : {});
        if (info) {
          td.appendChild(Dom.el('span', { className: 'result-matrix-level' }, [document.createTextNode('Level ' + info.number)]));
          td.appendChild(document.createTextNode(' '));
          td.appendChild(Dom.el('span', { className: 'result-matrix-name' }, [document.createTextNode(info.name)]));
        }
        if (isCurrent) {
          td.appendChild(Dom.el('span', { className: 'visually-hidden' }, [document.createTextNode(' — ' + uiText('out.matrixCurrentCell'))]));
          if (overridden) {
            td.appendChild(Dom.el('p', { className: 'result-matrix-note' }, [document.createTextNode(uiText('out.matrixOverriddenNote'))]));
          }
        }
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);

    return table;
  }

  function bandLabel(band) {
    return band === 'low' ? 'Low' : band === 'medium' ? 'Medium' : 'High';
  }

  // --- Drivers and the full answer record -----------------------------------

  function buildDrivers(scoring) {
    var container = Dom.el('div', { className: 'result-drivers' });
    container.appendChild(Dom.el('h3', {}, [document.createTextNode(uiText('out.driversHeading'))]));

    [
      { axis: 'costOfSpeaking', label: uiText('out.axisSpeakingLabel'), phrase: 'speaking' },
      { axis: 'costOfStayingQuiet', label: uiText('out.axisQuietLabel'), phrase: 'staying quiet' }
    ].forEach(function (axisInfo) {
      var drivers = (scoring.drivers && scoring.drivers[axisInfo.axis]) || [];
      if (!drivers.length) return;
      var list = Dom.el('ul', { className: 'result-driver-list' });
      drivers.forEach(function (driver) {
        var line = fillTemplate(uiText('out.driverLine'), { 'answer text': driver.text, axis: axisInfo.phrase });
        list.appendChild(Dom.el('li', {}, [document.createTextNode(line)]));
      });
      container.appendChild(list);
    });

    return container;
  }

  // Task item 5, second half: "the answers given" — every answered question,
  // in the order asked, in the same full descriptive phrasing used
  // throughout (CLAUDE.md, "no free text ... full descriptive phrases").
  function buildAnswerRecord(answers) {
    var qById = questionsById();
    var oById = optionsById();
    var container = Dom.el('div', { className: 'result-answers' });
    container.appendChild(Dom.el('h3', {}, [document.createTextNode(uiText('out.answersHeading'))]));

    var dl = Dom.el('dl');
    (config.questions || []).forEach(function (question) {
      var selected = answers[question.id];
      if (!selected || !selected.length) return;
      var text = selected.map(function (id) { return (oById[id] && oById[id].text) || id; }).join('; ');
      dl.appendChild(Dom.el('dt', {}, [document.createTextNode(question.text)]));
      dl.appendChild(Dom.el('dd', {}, [document.createTextNode(text)]));
    });
    container.appendChild(dl);
    return container;
  }

  // --- Qualifiers: overrides, notes, check-yourself, low-confidence --------
  //
  // Task item 4: "This block sits above the reasoning, not below it, because
  // some of these are arguments against acting on the recommendation and
  // must survive being skimmed."

  function buildOverrideBlock(scoring, overrides) {
    var applied = overrides.applied;
    if (!applied) return null;

    var definition = overrideDefinitionFor(applied.id);
    if (!definition) return null;

    var arithmeticLevel = scoring.level;
    var finalLevel = overrides.finalLevel;
    var arithmeticInfo = levelInfo(arithmeticLevel);
    var finalInfo = levelInfo(finalLevel);

    var container = Dom.el('div', { className: 'result-override' });
    container.appendChild(Dom.el('h3', {}, [document.createTextNode(uiText('out.overrideHeading'))]));

    var sentence;
    var isDownward = definition.renderTemplate === 'downward';
    var isUpward = definition.renderTemplate === 'upward';

    if (isDownward && finalLevel !== arithmeticLevel) {
      var templateId = definition.functions ? 'out.override.downward' : 'out.override.downward.noFunctions';
      sentence = fillTemplate(uiText(templateId), {
        arithmeticLevel: arithmeticInfo.label,
        leadIn: definition.leadIn,
        finalLevel: finalInfo.label,
        functions: definition.functions
      });
    } else if (isUpward && finalLevel !== arithmeticLevel) {
      sentence = fillTemplate(uiText('out.override.upward'), {
        arithmeticLevel: arithmeticInfo.label,
        leadIn: definition.leadIn,
        finalLevel: finalInfo.label
      });
    } else {
      // The rule fired but did not move the number (the arithmetic already
      // sat inside its range, or already met its floor) — the specific
      // "downward"/"upward" sentences both claim a change that didn't
      // happen here, so fall back to the general rule copy instead of
      // overstating it.
      sentence = uiText('out.overrideIntro');
    }

    container.appendChild(Dom.el('p', {}, [document.createTextNode(sentence)]));

    if (isDownward && finalLevel !== arithmeticLevel) {
      container.appendChild(Dom.el('p', { className: 'result-override-closing' }, [document.createTextNode(uiText('out.override.downward.closingLine'))]));
    }

    return container;
  }

  function buildGateOutcomeBlock(scoring, resolvedLevel) {
    var arithmeticInfo = levelInfo(scoring.level); // Level 5, the matrix cell for this band pair
    var sixInfo = levelInfo(6);
    var container = Dom.el('div', { className: 'result-gate-outcome' });
    var sentence = gateAnswer
      ? fillTemplate(uiText('out.gate.upward'), { arithmeticLevel: arithmeticInfo.label, finalLevel: sixInfo.label })
      : fillTemplate(uiText('out.gate.declined'), { potentialLevel: sixInfo.label, finalLevel: arithmeticInfo.label });
    container.appendChild(Dom.el('p', {}, [document.createTextNode(sentence)]));
    return container;
  }

  function buildNotesBlock(scoring, overrides) {
    var notes = (scoring.notes || []).slice();
    if (overrides.internalAudienceNote) notes = notes.concat([overrides.internalAudienceNote]);
    if (!notes.length) return null;

    var container = Dom.el('div', { className: 'result-notes' });
    notes.forEach(function (note) {
      var text = noteTextFor(note.noteId);
      if (!text) return;
      container.appendChild(Dom.el('p', { className: 'result-note' }, [document.createTextNode(text)]));
    });
    return container.childNodes.length ? container : null;
  }

  function buildCheckYourselfBlock(overrides) {
    if (!overrides.checkYourselfFlag) return null;
    var container = Dom.el('div', { className: 'result-check-yourself' });
    container.appendChild(Dom.el('h3', {}, [document.createTextNode(uiText('out.checkYourselfHeading'))]));
    container.appendChild(Dom.el('p', {}, [document.createTextNode(uiText('out.checkYourself'))]));
    return container;
  }

  function buildLegalCrossCheckBlock(overrides) {
    var crossCheck = overrides.legalCrossCheck;
    if (!crossCheck) return null;
    var text;
    if (crossCheck.consistent) {
      var finding = crossCheck.overrideIds.length
        ? crossCheck.overrideIds.map(function (id) {
            var definition = overrideDefinitionFor(id);
            return definition ? definition.leadIn : id;
          }).join('; ')
        : 'the cost of staying quiet is high';
      text = fillTemplate(uiText('out.q9eConsistent'), { finding: finding });
    } else {
      text = uiText('out.q9eNoRoute');
    }
    return Dom.el('p', { className: 'result-legal-cross-check' }, [document.createTextNode(text)]);
  }

  function buildLowConfidenceBlock(scoring) {
    if (!scoring.lowConfidence) return null;
    var threshold = config.bandBoundaries && config.bandBoundaries.lowConfidenceThreshold;
    var text = fillTemplate(uiText('out.lowConfidenceCaveat'), { threshold: threshold });
    return Dom.el('p', { className: 'result-low-confidence' }, [document.createTextNode(text)]);
  }

  // --- What would change this ------------------------------------------------

  function buildChangeBlock(scoring) {
    var container = Dom.el('div', { className: 'result-change' });
    container.appendChild(Dom.el('h3', {}, [document.createTextNode(uiText('out.changeHeading'))]));
    container.appendChild(Dom.el('p', {}, [document.createTextNode(uiText('out.changeIntro'))]));

    var unknowns = scoring.unknownSelections || [];
    if (unknowns.length) {
      var list = Dom.el('ul', { className: 'result-unknowns' });
      unknowns.forEach(function (unknown) {
        list.appendChild(Dom.el('li', {}, [document.createTextNode(unknown.text)]));
      });
      container.appendChild(list);
    }

    return container;
  }

  // --- The levels either side (expand on tap, not hover) ---------------------

  function buildNeighboursBlock(finalLevel, primaryAxis) {
    var container = Dom.el('div', { className: 'result-neighbours' });
    container.appendChild(Dom.el('h3', {}, [document.createTextNode(uiText('out.neighboursHeading'))]));
    container.appendChild(Dom.el('p', {}, [document.createTextNode(uiText('out.neighboursIntro'))]));

    [
      { level: finalLevel - 1, templateId: 'out.levelDown', suffix: 'down' },
      { level: finalLevel + 1, templateId: 'out.levelUp', suffix: 'up' }
    ].forEach(function (neighbour) {
      if (neighbour.level < 1 || neighbour.level > 7) return;
      var info = levelInfo(neighbour.level);
      if (!info.def) return;

      var panelId = 'result-neighbour-' + neighbour.suffix;
      var button = Dom.el('button', {
        type: 'button',
        className: 'result-neighbour-control',
        'aria-expanded': 'false',
        'aria-controls': panelId
      }, [document.createTextNode(info.label)]);

      var panel = Dom.el('div', { id: panelId });
      panel.hidden = true;
      // The template already supplies the full stop after {level def}
      // (COPY.md: "One level down would mean: {level def}. That is..."),
      // so a trailing full stop already on the level definition is trimmed
      // here to avoid printing it twice — formatting only, not a wording change.
      var def = info.def.replace(/\.\s*$/, '');
      var text = fillTemplate(uiText(neighbour.templateId), { 'level def': def, axis: primaryAxis });
      panel.appendChild(Dom.el('p', {}, [document.createTextNode(text)]));

      button.addEventListener('click', function () {
        var expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        panel.hidden = expanded;
      });

      container.appendChild(button);
      container.appendChild(panel);
    });

    return container;
  }

  // Which axis reading is most useful to argue with depends on which axis
  // actually drove the level — the higher-banded axis is the one a reader
  // would plausibly contest (SPEC.md I.10 wants "if you think {axis} is
  // overstated/understated", not a fixed axis regardless of the result).
  function primaryAxisLabel(scoring) {
    if (!scoring.bands) return uiText('out.axisQuietLabel');
    var order = { low: 0, medium: 1, high: 2 };
    return order[scoring.bands.costOfStayingQuiet] >= order[scoring.bands.costOfSpeaking]
      ? uiText('out.axisQuietLabel')
      : uiText('out.axisSpeakingLabel');
  }

  // --- Handoff and disclaimer teaser -----------------------------------------

  var HANDOFF_LEVELS = { 3: true, 4: true, 5: true, 6: true };

  function buildHandoffBlock(finalLevel) {
    var text = HANDOFF_LEVELS[finalLevel] ? uiText('out.handoff') : uiText('out.noHandoff');
    return Dom.el('p', { className: 'result-handoff' }, [document.createTextNode(text)]);
  }

  function buildDisclaimerTeaser() {
    return Dom.el('p', { className: 'result-disclaimer-teaser' }, [document.createTextNode(uiText('page.disclaimerTeaser'))]);
  }

  // --- Top-level assembly -----------------------------------------------------

  function renderAll() {
    if (!latest || !resultsEl) return;
    var scoring = latest.scoring;
    var overrides = latest.overrides;
    var answers = latest.answers;

    Dom.clear(resultsEl);
    var heading = Dom.el('h2', { id: 'results-heading', className: 'visually-hidden' }, [document.createTextNode('Your result')]);
    resultsEl.appendChild(heading);

    if (scoring.configError) {
      return; // events.js already shows #config-error; nothing to render here.
    }

    var needsGate = gateApplicable(scoring, overrides);
    if (needsGate && gateAnswer === null) {
      resultsEl.appendChild(buildGateControl());
      return;
    }

    var finalLevel = needsGate
      ? PulseCheck.Scoring.resolveLevel6Gate(gateAnswer)
      : overrides.finalLevel;
    var overridden = finalLevel !== scoring.level;
    var finalInfo = levelInfo(finalLevel);

    // 1. The matrix.
    resultsEl.appendChild(buildMatrix(scoring, overridden));

    // 2. The level and the two scores, with a link to SCORING.md.
    // SCORING.md does not exist in this repository yet (flagged at the end
    // of this session) — these are forward references to the section it
    // will contain, per SPEC.md I.2 and this session's own instruction to
    // link to it regardless.
    var levelBlock = Dom.el('div', { className: 'result-level' });
    levelBlock.appendChild(Dom.el('p', { className: 'result-level-heading' }, [
      document.createTextNode(fillTemplate(uiText('out.heading'), { n: finalInfo.number, 'level name': finalInfo.name }))
    ]));
    var scoresList = Dom.el('dl', { className: 'result-scores' });
    scoresList.appendChild(Dom.el('dt', {}, [document.createTextNode(uiText('out.axisSpeakingLabel'))]));
    scoresList.appendChild(Dom.el('dd', {}, [
      document.createTextNode(scoring.scores.costOfSpeaking + ' / 100 (' + bandLabel(scoring.bands.costOfSpeaking) + ')'),
      Dom.el('a', { href: 'SCORING.md#cost-of-speaking' }, [document.createTextNode(' — how this is worked out')])
    ]));
    scoresList.appendChild(Dom.el('dt', {}, [document.createTextNode(uiText('out.axisQuietLabel'))]));
    scoresList.appendChild(Dom.el('dd', {}, [
      document.createTextNode(scoring.scores.costOfStayingQuiet + ' / 100 (' + bandLabel(scoring.bands.costOfStayingQuiet) + ')'),
      Dom.el('a', { href: 'SCORING.md#cost-of-staying-quiet' }, [document.createTextNode(' — how this is worked out')])
    ]));
    levelBlock.appendChild(scoresList);
    resultsEl.appendChild(levelBlock);

    // 3. What the level means.
    var meaningBlock = Dom.el('div', { className: 'result-meaning' });
    meaningBlock.appendChild(Dom.el('p', {}, [document.createTextNode(finalInfo.def)]));
    if (finalInfo.not) meaningBlock.appendChild(Dom.el('p', {}, [document.createTextNode(finalInfo.not)]));
    resultsEl.appendChild(meaningBlock);

    // 4. Qualifiers — overrides, the gate outcome, notes, check-yourself,
    // the Q9 legal cross-check, the low-confidence caveat. Above the
    // reasoning: see buildOverrideBlock's comment.
    var overrideBlock = buildOverrideBlock(scoring, overrides);
    if (overrideBlock) resultsEl.appendChild(overrideBlock);
    if (needsGate) resultsEl.appendChild(buildGateOutcomeBlock(scoring, finalLevel));

    var notesBlock = buildNotesBlock(scoring, overrides);
    if (notesBlock) resultsEl.appendChild(notesBlock);

    var checkYourselfBlock = buildCheckYourselfBlock(overrides);
    if (checkYourselfBlock) resultsEl.appendChild(checkYourselfBlock);

    var legalCrossCheckBlock = buildLegalCrossCheckBlock(overrides);
    if (legalCrossCheckBlock) resultsEl.appendChild(legalCrossCheckBlock);

    var lowConfidenceBlock = buildLowConfidenceBlock(scoring);
    if (lowConfidenceBlock) resultsEl.appendChild(lowConfidenceBlock);

    // 5. What led here.
    resultsEl.appendChild(buildDrivers(scoring));
    resultsEl.appendChild(buildAnswerRecord(answers));

    // 6. What would change this.
    resultsEl.appendChild(buildChangeBlock(scoring));

    // The levels either side (task item 10 / SPEC.md I.10), then the
    // disclaimer teaser and the handoff.
    resultsEl.appendChild(buildNeighboursBlock(finalLevel, primaryAxisLabel(scoring)));
    resultsEl.appendChild(buildDisclaimerTeaser());
    resultsEl.appendChild(buildHandoffBlock(finalLevel));

    // Announce completion through the existing aria-live region (the
    // #results section itself is aria-live="polite" in index.html) using
    // aria.resultReady, visually hidden so sighted users see the full
    // result above rather than a duplicate summary line.
    var announcement = fillTemplate(uiText('aria.resultReady'), { n: finalInfo.number, 'level name': finalInfo.name });
    resultsEl.insertBefore(
      Dom.el('p', { className: 'visually-hidden' }, [document.createTextNode(announcement)]),
      heading.nextSibling
    );
  }

  return { init: init };
})();
