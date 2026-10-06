// Responsibility: rendering the results region (SPEC.md section I) —
// recommended level, the two scores and matrix position, what drove each
// score, any override applied and the full text of every rule that fired,
// the check-yourself flag, escalation
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
  // It fires when q2c.h is selected (js/overrides.js safetyFired()).
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

  // A rule's leadIn is stored lower case (config and COPY.md) because most
  // templates place it mid-sentence. Where a template places it at the
  // start of a sentence — the template's own start, or after a full stop —
  // its first letter is capitalised here, at render, and the stored string
  // is left alone.
  // The floorOverruled.same template names its sentence-start placeholder
  // {FloorLeadIn} outright (COPY.md section 6); it is filled with the same
  // stored leadIn, capitalised the same way.
  var LEAD_IN_KEYS = ['leadIn', 'ruleLeadIn', 'floorLeadIn', 'ceilingLeadIn'];

  function capitalise(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function fillOverrideTemplate(template, values) {
    var adjusted = {};
    Object.keys(values || {}).forEach(function (key) { adjusted[key] = values[key]; });
    LEAD_IN_KEYS.forEach(function (key) {
      var value = adjusted[key];
      var at = template ? template.indexOf('{' + key + '}') : -1;
      if (typeof value !== 'string' || !value || at === -1) return;
      if (at === 0 || /[.!?]\s+$/.test(template.slice(0, at))) {
        adjusted[key] = capitalise(value);
      }
    });
    return fillTemplate(template, adjusted);
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
  // applies, via PulseCheck.Scoring.resolveLevel6Gate(). Blocked only by
  // a fired rule that forces or limits the level, never by a floor — see
  // level6GateBlocked() in js/overrides.js and SPEC.md C.1.
  function gateApplicable(scoring, overrides) {
    return !overrides.level6GateBlocked && scoring.level6Eligible === true;
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

  // Grouped by axis, each group headed with the axis name in full, and
  // each line pairing the question with the answer that drove it — a bare
  // answer fragment ("Flat") is unreadable on its own, while "Which way is
  // it moving? Flat" stands alone (task instruction; this block is
  // repeated verbatim in the export, SPEC.md section I.3/J, once export
  // exists).
  function buildDrivers(scoring) {
    var container = Dom.el('div', { className: 'result-drivers' });
    container.appendChild(Dom.el('h3', {}, [document.createTextNode(uiText('out.driversHeading'))]));

    [
      { axis: 'costOfSpeaking', label: uiText('out.axisSpeakingLabel') },
      { axis: 'costOfStayingQuiet', label: uiText('out.axisQuietLabel') }
    ].forEach(function (axisInfo) {
      var drivers = (scoring.drivers && scoring.drivers[axisInfo.axis]) || [];
      if (!drivers.length) return;
      container.appendChild(Dom.el('h4', {}, [document.createTextNode(axisInfo.label)]));
      var list = Dom.el('ul', { className: 'result-driver-list' });
      drivers.forEach(function (driver) {
        var line = fillTemplate(uiText('out.driverLine'), { 'question text': driver.questionText, 'answer text': driver.text });
        list.appendChild(Dom.el('li', {}, [document.createTextNode(line)]));
      });
      container.appendChild(list);
    });

    return container;
  }

  // Task item 5, second half: "the answers given" — every answered question,
  // in the order asked, in the same full descriptive phrasing used
  // throughout (CLAUDE.md, "no free text ... full descriptive phrases").
  //
  // Path-scoped via PulseCheck.Scoring.questionsOnPath (see the
  // PATH-SCOPED comment in js/scoring.js): a question Back-navigation has
  // made unreachable must not still appear in the exported record, even
  // though its answer may still be sitting in `answers`.
  function buildAnswerRecord(answers) {
    var oById = optionsById();
    var container = Dom.el('div', { className: 'result-answers' });
    container.appendChild(Dom.el('h3', {}, [document.createTextNode(uiText('out.answersHeading'))]));

    var dl = Dom.el('dl');
    PulseCheck.Scoring.questionsOnPath(config, answers).forEach(function (question) {
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

  // The level a capping rule allows at most: a ceiling's (or a forced
  // rule's) own level, or a clamp's max. No rule in config uses a clamp
  // today; the branch is kept because js/overrides.js still supports one.
  function capLevelOf(definition) {
    var outcome = (definition && definition.outcome) || {};
    if (outcome.type === 'clamp') return outcome.max;
    return typeof outcome.level === 'number' ? outcome.level : null;
  }

  // SPEC.md F.7: a rule's functions are stored as a list of single
  // functions (["HR", "legal"]), so each can be named once per block. A
  // list is joined for display as "A", "A and B" or "A, B and C", with no
  // comma before "and".
  function functionsOf(definition) {
    return (definition && Array.isArray(definition.functions)) ? definition.functions : [];
  }

  function joinFunctions(list) {
    if (list.length <= 1) return list.join('');
    return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
  }

  function isFloor(fired) {
    return !!(fired.outcome && fired.outcome.type === 'floor');
  }

  function isCeiling(fired) {
    return !!(fired.outcome && fired.outcome.type === 'ceiling');
  }

  // SPEC.md I.4 / F.7. The template is chosen by the actual movement from
  // the arithmetic level to overrides.finalLevel — never from a rule's
  // renderTemplate alone, so no case can use downward wording when the
  // level went up. Four cases:
  //
  // 1. A ceiling sets the final level below a floor that fired (a floor
  //    "overruled") and that floor's level is above the arithmetic level.
  //    The highest such floor (ties by priority) and the binding ceiling
  //    are described together (floorOverruled.up/.down/.same, by
  //    movement); every other floor that pointed above the final level is
  //    listed in out.override.otherFloors, so no overruled floor goes
  //    unnamed (SPEC.md F.7, transparency principle). Where every
  //    overruled floor is at or below the arithmetic level, the floor
  //    raised nothing, so case 3 below describes the ceiling's own move
  //    and all of those floors are listed in out.override.otherFloors.
  // 2. The level went up: the single winner (a floor, or rule.safety) is
  //    described (out.override.upward).
  // 3. The level went down: the binding (lowest) ceiling is described
  //    (out.override.downward).
  // 4. Nothing moved: the binding ceiling is described with the "capped"
  //    wording if one fired, otherwise the single winner with the floor
  //    wording, judged against the arithmetic level.
  //
  // out.override.alsoSpeakTo then names every function of every other
  // fired ceiling that the main sentence has not already named, in
  // priority order, each once, and is omitted when nothing is left — so
  // every fired ceiling's functions appear in the block, and none twice.
  //
  // Where the Level 6 gate has raised the result, this block still compares
  // against the arithmetic level, not the gated result: the gate outcome
  // block that follows it is what explains the move to Level 6.
  function buildOverrideBlock(scoring, overrides) {
    var fired = overrides.fired || [];
    if (!fired.length) return null;

    var arithmeticLevel = scoring.level;
    var finalLevel = overrides.finalLevel;
    var applied = overrides.applied;
    var ceiling = overrides.ceiling;
    var safetyWon = !!(applied && applied.id === SAFETY_OVERRIDE.id);
    var arithmeticLabel = levelInfo(arithmeticLevel).label;
    var finalLabel = levelInfo(finalLevel).label;
    var movement = finalLevel > arithmeticLevel ? 'up' : finalLevel < arithmeticLevel ? 'down' : 'same';

    var overruledFloors = (ceiling && !safetyWon)
      ? fired.filter(function (f) { return isFloor(f) && f.outcome.level > finalLevel; })
        .sort(function (a, b) { return (b.outcome.level - a.outcome.level) || (a.priority - b.priority); })
      : [];

    var heading = uiText('out.overrideHeading');
    var described = null;
    var sentence = '';
    var extraLines = [];
    var namedFunctions = []; // the functions the main sentence names

    var floorAboveArithmetic = overruledFloors.length > 0 && overruledFloors[0].outcome.level > arithmeticLevel;

    if (floorAboveArithmetic) {
      described = ceiling;
      var floorDefinition = overrideDefinitionFor(overruledFloors[0].id);
      var ceilingDefinition = overrideDefinitionFor(ceiling.id);
      if (!floorDefinition || !ceilingDefinition) return null;
      heading = uiText('out.overrideRulesHeading');
      namedFunctions = functionsOf(ceilingDefinition);
      var overruledTemplateId = 'out.override.floorOverruled.' + movement + (namedFunctions.length ? '' : '.noFunctions');
      sentence = fillOverrideTemplate(uiText(overruledTemplateId), {
        arithmeticLevel: arithmeticLabel,
        floorLeadIn: floorDefinition.leadIn,
        FloorLeadIn: capitalise(floorDefinition.leadIn),
        floorLevel: levelInfo(overruledFloors[0].outcome.level).label,
        ceilingLeadIn: ceilingDefinition.leadIn,
        finalLevel: finalLabel,
        functions: joinFunctions(namedFunctions)
      });
      var otherLeadIns = overruledFloors.slice(1).map(function (f) {
        var definition = overrideDefinitionFor(f.id);
        return definition ? definition.leadIn : f.id;
      });
      if (otherLeadIns.length) {
        extraLines.push(fillTemplate(uiText('out.override.otherFloors'), { leadIns: otherLeadIns.join('; ') }));
      }
    } else {
      if (movement === 'up') {
        described = applied;
      } else if (ceiling && !safetyWon) {
        described = ceiling;
      } else {
        described = applied;
      }
      var definition = described ? overrideDefinitionFor(described.id) : null;
      if (!definition) return null;
      var describedIsFloor = isFloor(described) || (described && described.id === SAFETY_OVERRIDE.id);

      if (movement === 'up') {
        sentence = fillOverrideTemplate(uiText('out.override.upward'), {
          arithmeticLevel: arithmeticLabel,
          leadIn: definition.leadIn,
          finalLevel: finalLabel
        });
      } else if (movement === 'down') {
        namedFunctions = functionsOf(definition);
        var downwardTemplateId = namedFunctions.length ? 'out.override.downward' : 'out.override.downward.noFunctions';
        sentence = fillOverrideTemplate(uiText(downwardTemplateId), {
          arithmeticLevel: arithmeticLabel,
          leadIn: definition.leadIn,
          finalLevel: finalLabel,
          functions: joinFunctions(namedFunctions)
        });
      } else if (describedIsFloor) {
        // A floor fired but the arithmetic already sat at or above what it
        // requires (COPY.md: "out.override.satisfied"/".matched").
        // "out.overrideHeading" oversells this — nothing moved — so it's
        // paired with "out.overrideAlsoHeading" instead. ruleLevel here is
        // always <= arithmeticLevel: equal picks "matched", lower picks
        // "satisfied".
        heading = uiText('out.overrideAlsoHeading');
        var ruleLevel = definition.outcome && typeof definition.outcome.level === 'number' ? definition.outcome.level : null;
        var matched = ruleLevel !== null && ruleLevel === arithmeticLevel;
        sentence = fillOverrideTemplate(uiText(matched ? 'out.override.matched' : 'out.override.satisfied'), {
          arithmeticLevel: arithmeticLabel,
          ruleLeadIn: definition.leadIn,
          ruleLevel: ruleLevel !== null ? levelInfo(ruleLevel).label : ''
        });
      } else {
        // A capping rule fired without moving the level (the arithmetic
        // already sat at or under its cap) — the mirror of the floor case
        // above, with "cap" wording instead of "floor" wording (COPY.md:
        // "out.override.cappedSatisfied"/".cappedBelow"). capLevel is always
        // >= arithmeticLevel here: equal picks "cappedSatisfied", higher
        // picks "cappedBelow".
        heading = uiText('out.overrideAlsoHeading');
        var capLevel = capLevelOf(definition);
        var atCap = capLevel !== null && capLevel === arithmeticLevel;
        namedFunctions = functionsOf(definition);
        var cappedTemplateId = namedFunctions.length
          ? (atCap ? 'out.override.cappedSatisfied' : 'out.override.cappedBelow')
          : (atCap ? 'out.override.cappedSatisfied.noFunctions' : 'out.override.cappedBelow.noFunctions');
        sentence = fillOverrideTemplate(uiText(cappedTemplateId), {
          arithmeticLevel: arithmeticLabel,
          ruleLeadIn: definition.leadIn,
          ruleLevel: capLevel !== null ? levelInfo(capLevel).label : '',
          consultFunctions: joinFunctions(namedFunctions)
        });
      }

      if (overruledFloors.length) {
        heading = uiText('out.overrideRulesHeading');
        extraLines.push(fillTemplate(uiText('out.override.otherFloors'), {
          leadIns: overruledFloors.map(function (f) {
            var floorDef = overrideDefinitionFor(f.id);
            return floorDef ? floorDef.leadIn : f.id;
          }).join('; ')
        }));
      }
    }

    // Where rule.safety sets the level, no ceiling caps it (SPEC.md F.7), but
    // every ceiling that fired still constrains what is said, so each is
    // named here by its leadIn, in priority order. Floors are not listed.
    // Sits after the main sentence and before out.override.alsoSpeakTo.
    if (safetyWon) {
      var stillApplyLeadIns = fired.filter(isCeiling).map(function (f) {
        var ceilingDef = overrideDefinitionFor(f.id);
        return ceilingDef ? ceilingDef.leadIn : f.id;
      });
      if (stillApplyLeadIns.length) {
        extraLines.push(fillTemplate(uiText('out.override.stillApplies'), { leadIns: stillApplyLeadIns.join('; ') }));
      }
    }

    var otherFunctions = [];
    fired.forEach(function (f) {
      if (!isCeiling(f) || f === described) return;
      functionsOf(overrideDefinitionFor(f.id)).forEach(function (fn) {
        if (namedFunctions.indexOf(fn) === -1 && otherFunctions.indexOf(fn) === -1) otherFunctions.push(fn);
      });
    });
    if (otherFunctions.length) {
      extraLines.push(fillTemplate(uiText('out.override.alsoSpeakTo'), { functions: joinFunctions(otherFunctions) }));
    }

    var container = Dom.el('div', { className: 'result-override' });
    container.appendChild(Dom.el('h3', {}, [document.createTextNode(heading)]));
    container.appendChild(Dom.el('p', {}, [document.createTextNode(sentence)]));
    extraLines.forEach(function (line) {
      container.appendChild(Dom.el('p', {}, [document.createTextNode(line)]));
    });

    // The closing line applies wherever the rule described is a downward
    // (capping) rule, whether it moved the level or only fired without
    // moving it (SPEC.md I.4) — a rule that capped the arithmetic in place
    // is still telling the user there is a ceiling here, which is exactly
    // when they most need to know the tool has limits. Never appended where
    // the rule described is an upward (floor) rule.
    var describedDefinition = described ? overrideDefinitionFor(described.id) : null;
    if (describedDefinition && describedDefinition.renderTemplate === 'downward') {
      container.appendChild(Dom.el('p', { className: 'result-override-closing' }, [document.createTextNode(uiText('out.override.downward.closingLine'))]));
    }

    return container;
  }

  // SPEC.md I.4: the full text of every rule that fired, once each, straight
  // after the override block — rule.safety first, then the rest in priority
  // order (overrides.fired is already sorted that way, safety at -1), and
  // including rules that fired without changing the level. Each rule's text
  // is split on blank lines into paragraphs, and its first sentence is set
  // in <strong>, matching how COPY.md section 7 marks it up. Nothing is
  // rendered where no rule fired.
  function splitFirstSentence(paragraph) {
    var match = /^(.*?[.!?])(\s+|$)([\s\S]*)$/.exec(paragraph);
    return match ? { first: match[1], rest: match[3] } : { first: paragraph, rest: '' };
  }

  function buildRuleTextsBlock(overrides) {
    var fired = overrides.fired || [];
    var container = Dom.el('div', { className: 'result-rule-texts' });
    fired.forEach(function (f) {
      var definition = overrideDefinitionFor(f.id);
      if (!definition || !definition.text) return;
      var ruleEl = Dom.el('div', { className: 'result-rule-text' });
      definition.text.split(/\n\s*\n/).forEach(function (paragraph, i) {
        var p = Dom.el('p');
        if (i === 0) {
          var parts = splitFirstSentence(paragraph);
          p.appendChild(Dom.el('strong', {}, [document.createTextNode(parts.first)]));
          if (parts.rest) p.appendChild(document.createTextNode(' ' + parts.rest));
        } else {
          p.appendChild(document.createTextNode(paragraph));
        }
        ruleEl.appendChild(p);
      });
      container.appendChild(ruleEl);
    });
    return container.childNodes.length ? container : null;
  }

  function buildGateOutcomeBlock(scoring, resolvedLevel) {
    var arithmeticInfo = levelInfo(scoring.level); // Level 5, the matrix cell for this band pair
    var gateInfo = levelInfo(6); // the level the gate can unlock
    var container = Dom.el('div', { className: 'result-gate-outcome' });
    var sentence = gateAnswer
      ? fillTemplate(uiText('out.gate.upward'), { arithmeticLevel: arithmeticInfo.label, gateLevel: gateInfo.label })
      : fillTemplate(uiText('out.gate.declined'), { arithmeticLevel: arithmeticInfo.label, gateLevel: gateInfo.label });
    container.appendChild(Dom.el('p', {}, [document.createTextNode(sentence)]));
    return container;
  }

  function buildNotesBlock(scoring, overrides) {
    var notes = (scoring.notes || []).slice();
    if (overrides.internalAudienceNote) notes = notes.concat([overrides.internalAudienceNote]);
    if (overrides.alreadyAskedNote) notes = notes.concat([overrides.alreadyAskedNote]);
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

    // SPEC.md I.8: one row per unknown answer on the path, in path order,
    // each giving the option's changeFind and changeEffect — never its
    // option text, which stays in "Your answers". Absent where no unknown
    // is on the path. Unstyled here: how it behaves at phone width is an
    // interface-session decision.
    var rows = scoring.changeRows || [];
    if (rows.length) {
      var table = Dom.el('table', { className: 'result-change-table' });
      table.appendChild(Dom.el('thead', {}, [Dom.el('tr', {}, [
        Dom.el('th', { scope: 'col' }, [document.createTextNode(uiText('out.change.findHeading'))]),
        Dom.el('th', { scope: 'col' }, [document.createTextNode(uiText('out.change.effectHeading'))])
      ])]));
      var tbody = Dom.el('tbody');
      rows.forEach(function (row) {
        tbody.appendChild(Dom.el('tr', {}, [
          Dom.el('td', {}, [document.createTextNode(row.find)]),
          Dom.el('td', {}, [document.createTextNode(row.effect)])
        ]));
      });
      table.appendChild(tbody);
      container.appendChild(table);
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

    // A floor that fired alongside an offered gate still holds: the gate's
    // answer can never take the level below it.
    var finalLevel = needsGate
      ? Math.max(PulseCheck.Scoring.resolveLevel6Gate(gateAnswer), overrides.finalLevel)
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
    var ruleTextsBlock = buildRuleTextsBlock(overrides);
    if (ruleTextsBlock) resultsEl.appendChild(ruleTextsBlock);
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
