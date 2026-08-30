// Responsibility: wiring DOM events (form input, navigation between question
// groups, glossary expand/collapse, export actions) to the other modules.
// Loaded last so every module it references is already defined.

(function () {
  document.addEventListener('DOMContentLoaded', function () {
    PulseCheck.Config.load()
      .then(function (config) {
        PulseCheck.Questions.init(config);
        PulseCheck.Render.init(config);
        wireStart(config);
        wireNav();
        wireSubmit(config);
        buildGlossary(config);
      })
      .catch(function () {
        var errorEl = document.getElementById('config-error');
        if (errorEl) errorEl.hidden = false;
      });
  });

  // Scoring and overrides are decision logic (CLAUDE.md); this listener is
  // only the wiring between the question set's submit event and those two
  // modules. It never fails silently: an invalid or incomplete config shows
  // state.configError, same as a config that failed to load at all.
  function wireSubmit(config) {
    var formEl = document.getElementById('pulse-check-form');
    if (!formEl) return;

    formEl.addEventListener('pulsecheck:submit', function (event) {
      var answers = event.detail.answers;

      if (!PulseCheck.Scoring.isConfigValid(config)) {
        var errorEl = document.getElementById('config-error');
        if (errorEl) errorEl.hidden = false;
        return;
      }

      var scoringResult = PulseCheck.Scoring.compute(answers, config);
      var overridesResult = PulseCheck.Overrides.apply(answers, scoringResult, config);

      formEl.dispatchEvent(new CustomEvent('pulsecheck:result', {
        detail: {
          answers: answers,
          scoring: scoringResult,
          overrides: overridesResult
        }
      }));
    });
  }

  function wireStart() {
    var startButton = document.getElementById('start-button');
    var introSection = document.getElementById('intro');
    var questionSetSection = document.getElementById('question-set');
    if (!startButton) return;
    startButton.addEventListener('click', function () {
      introSection.hidden = true;
      questionSetSection.hidden = false;
      PulseCheck.Questions.start();
    });
  }

  function wireNav() {
    var backButton = document.getElementById('nav-back');
    var skipButton = document.getElementById('nav-skip');
    var nextButton = document.getElementById('nav-next');
    if (backButton) backButton.addEventListener('click', function () { PulseCheck.Questions.back(); });
    if (skipButton) skipButton.addEventListener('click', function () { PulseCheck.Questions.skip(); });
    if (nextButton) nextButton.addEventListener('click', function () { PulseCheck.Questions.next(); });
  }

  // Glossary control pattern (SPEC.md section H): a real button per term,
  // aria-expanded/aria-controls, collapsed by default, keyboard-operable.
  // The same button caption is reused for every term (gloss.control.label),
  // with the term name itself always visible as plain text.
  function buildGlossary(config) {
    var container = document.getElementById('glossary-terms');
    if (!container || !config.glossary) return;

    var controlLabel = (config.uiCopy && config.uiCopy['gloss.control.label']) || '';
    var categories = [];
    var byCategory = {};

    config.glossary.forEach(function (entry) {
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = [];
        categories.push(entry.category);
      }
      byCategory[entry.category].push(entry);
    });

    categories.forEach(function (category) {
      var heading = document.createElement('h3');
      heading.textContent = category;
      container.appendChild(heading);

      var dl = document.createElement('dl');
      byCategory[category].forEach(function (entry, i) {
        var panelId = 'gloss-panel-' + entry.id;

        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'gloss-term';
        button.setAttribute('aria-expanded', 'false');
        button.setAttribute('aria-controls', panelId);
        button.textContent = entry.term + ' — ' + controlLabel;

        var dt = document.createElement('dt');
        dt.appendChild(button);

        var dd = document.createElement('dd');
        dd.id = panelId;
        dd.hidden = true;

        // Response-scale entries (SPEC.md section F, the level-below/
        // level-above explanation) carry a definition and, for most
        // levels, a separate "what this is not" line where confusion is
        // likely (COPY.md section 5); render them as separate paragraphs
        // rather than concatenating them into one string. Other glossary
        // entries carry a single definition and no "not" line.
        if (entry.category === 'The response scale') {
          dd.appendChild(PulseCheck.Dom.el('p', {}, [document.createTextNode(entry.definition)]));
          if (entry.not) {
            dd.appendChild(PulseCheck.Dom.el('p', {}, [document.createTextNode(entry.not)]));
          }
        } else {
          dd.textContent = entry.definition;
        }

        button.addEventListener('click', function () {
          var expanded = button.getAttribute('aria-expanded') === 'true';
          button.setAttribute('aria-expanded', String(!expanded));
          dd.hidden = expanded;
        });

        dl.appendChild(dt);
        dl.appendChild(dd);
      });
      container.appendChild(dl);
    });
  }
})();
