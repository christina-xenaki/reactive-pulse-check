// Responsibility: rendering the question set from config as real fieldsets,
// legends and labelled inputs, one group per view (SPEC.md section N), and
// tracking progress through it for the progress indicator. No free-text
// input, ever (CLAUDE.md).

window.PulseCheck = window.PulseCheck || {};

PulseCheck.Questions = (function () {
  var Dom = PulseCheck.Dom;

  var config = null;
  var answers = {}; // questionId -> array of selected option ids
  var visible = []; // questions applicable to the answers given so far
  var index = 0;

  var formEl = null;
  var progressEl = null;

  function init(cfg) {
    config = cfg;
    formEl = document.getElementById('pulse-check-form');
    progressEl = document.getElementById('progress');
  }

  function start() {
    answers = {};
    index = 0;
    renderCurrent();
  }

  // Branch questions and the shared prior-coverage block only apply to some
  // paths through the question set (SPEC.md section E), so the visible list
  // is recomputed against the answers given so far every time it changes.
  function evaluateCondition(cond) {
    if (!cond) return true;
    if (cond.any) return cond.any.some(evaluateCondition);
    if (cond.all) return cond.all.every(evaluateCondition);
    var selected = answers[cond.questionId] || [];
    if (cond.in) return cond.in.some(function (id) { return selected.indexOf(id) !== -1; });
    if (cond.notIn) return cond.notIn.every(function (id) { return selected.indexOf(id) === -1; });
    return true;
  }

  function recomputeVisible() {
    visible = config.questions.filter(function (question) {
      return evaluateCondition(question.showIf);
    });
    if (index >= visible.length) index = visible.length - 1;
    if (index < 0) index = 0;
  }

  function optionsFor(question) {
    return config.answerOptions.filter(function (option) {
      return option.questionId === question.id;
    });
  }

  function currentQuestion() {
    return visible[index];
  }

  function uiText(id) {
    return (config.uiCopy && config.uiCopy[id]) || '';
  }

  function renderCurrent() {
    recomputeVisible();
    var question = currentQuestion();
    if (!question) return;

    Dom.clear(formEl);
    formEl.appendChild(buildFieldset(question));

    updateProgress();
    updateNavButtons(question);

    var fieldset = formEl.querySelector('fieldset');
    fieldset.setAttribute('tabindex', '-1');
    fieldset.focus();
  }

  function buildFieldset(question) {
    var fieldset = document.createElement('fieldset');

    var legend = document.createElement('legend');
    legend.textContent = question.text;
    fieldset.appendChild(legend);

    if (question.helpText) {
      fieldset.appendChild(Dom.el('p', { className: 'question-help' }, [document.createTextNode(question.helpText)]));
    }

    if (question.optional) {
      fieldset.appendChild(Dom.el('p', { className: 'question-optional-note' }, [document.createTextNode(uiText('q.optional'))]));
    }

    var errorEl = Dom.el('p', { className: 'question-error', role: 'alert' });
    errorEl.hidden = true;
    fieldset.appendChild(errorEl);

    var inputType = question.type === 'multi' ? 'checkbox' : 'radio';
    var selected = answers[question.id] || [];

    optionsFor(question).forEach(function (option) {
      var input = document.createElement('input');
      input.type = inputType;
      input.name = question.id;
      input.id = 'input-' + option.id;
      input.value = option.id;
      input.checked = selected.indexOf(option.id) !== -1;
      input.addEventListener('change', function () {
        handleChange(question, input);
      });

      var label = document.createElement('label');
      label.setAttribute('for', input.id);
      label.textContent = option.text;

      var wrapper = document.createElement('div');
      wrapper.className = 'question-option';
      wrapper.appendChild(input);
      wrapper.appendChild(label);
      fieldset.appendChild(wrapper);
    });

    return fieldset;
  }

  function handleChange(question, input) {
    var current = (answers[question.id] || []).slice();
    if (question.type === 'multi') {
      var pos = current.indexOf(input.value);
      if (input.checked && pos === -1) current.push(input.value);
      if (!input.checked && pos !== -1) current.splice(pos, 1);
    } else {
      current = input.checked ? [input.value] : [];
    }
    answers[question.id] = current;
    clearError();
  }

  function clearError() {
    var errorEl = formEl.querySelector('.question-error');
    if (errorEl) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }
  }

  function showError(message) {
    var errorEl = formEl.querySelector('.question-error');
    if (errorEl) {
      errorEl.hidden = false;
      errorEl.textContent = message;
    }
  }

  function updateProgress() {
    if (!progressEl) return;
    var template = uiText('q.progress') || 'Question {n} of {total}';
    progressEl.textContent = template
      .replace('{n}', String(index + 1))
      .replace('{total}', String(visible.length));

    // aria.progress is a fuller, punctuated sentence for assistive tech,
    // distinct from the compact text shown visually (q.progress);
    // role="status" on #progress already makes this an announced live region.
    var ariaTemplate = uiText('aria.progress');
    if (ariaTemplate) {
      progressEl.setAttribute('aria-label', ariaTemplate
        .replace('{n}', String(index + 1))
        .replace('{total}', String(visible.length)));
    }
  }

  function updateNavButtons(question) {
    var backBtn = document.getElementById('nav-back');
    var skipBtn = document.getElementById('nav-skip');
    var nextBtn = document.getElementById('nav-next');
    var isLast = index === visible.length - 1;

    if (backBtn) backBtn.hidden = index === 0;
    if (skipBtn) skipBtn.hidden = !question.optional;
    if (nextBtn) nextBtn.textContent = isLast ? uiText('ui.submit') : uiText('ui.next');
  }

  function next() {
    var question = currentQuestion();
    if (!question) return;
    var hasAnswer = (answers[question.id] || []).length > 0;
    if (!question.optional && !hasAnswer) {
      showError(uiText('state.incomplete'));
      return;
    }
    advance();
  }

  function skip() {
    var question = currentQuestion();
    if (!question || !question.optional) return;
    answers[question.id] = [];
    advance();
  }

  // The answer just given may reveal further branch or prior-coverage
  // questions (SPEC.md section E), so the visible list is recomputed against
  // the latest answers before deciding whether this was the last question.
  function advance() {
    recomputeVisible();
    if (index === visible.length - 1) {
      submit();
      return;
    }
    index += 1;
    renderCurrent();
  }

  function back() {
    if (index === 0) return;
    index -= 1;
    renderCurrent();
  }

  function submit() {
    // Scoring the two axes and applying overrides is decision logic and is
    // built in its own session (CLAUDE.md). This event is the hook point
    // scoring.js/overrides.js/render.js will listen for once that exists.
    formEl.dispatchEvent(new CustomEvent('pulsecheck:submit', {
      detail: { answers: answers }
    }));
  }

  return {
    init: init,
    start: start,
    next: next,
    back: back,
    skip: skip,
    getAnswers: function () { return answers; }
  };
})();
