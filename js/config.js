// Responsibility: loading config/config.default.json (and any sector config)
// via fetch, validating its shape, and exposing it to the other modules.
// Requires the tool to be served over http:// — it cannot run from a
// file:// URL.

window.PulseCheck = window.PulseCheck || {};

PulseCheck.Config = (function () {
  var CONFIG_URL = 'config/config.default.json';
  var data = null;

  function load() {
    return fetch(CONFIG_URL)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load ' + CONFIG_URL + ': ' + response.status);
        }
        return response.json();
      })
      .then(function (json) {
        data = json;
        return data;
      });
  }

  function get() {
    return data;
  }

  // Every problem that would make the loaded config unusable, each naming
  // the check that failed and the option or rule that caused it, so
  // js/events.js can log them and show out.configInvalid instead of a
  // result (SPEC.md C.4). An empty list means the config is valid. The
  // scoring checks (weights, bands, matrix) are js/scoring.js's own; the
  // rest are added here:
  // - every unknown option (isUnknown) carries a non-empty changeFind and
  //   changeEffect — no generic fallback exists for either (SPEC.md I.8);
  // - every triggersOverride names a rule that exists in config;
  // - every rule's functions, where present, is a non-empty list of
  //   non-empty strings (SPEC.md F.7).
  function validate(config) {
    var problems = PulseCheck.Scoring.configProblems(config);
    if (!config) return problems;

    var rulesById = {};
    (config.alwaysOnRegimes || []).concat(config.sectorOverrides || []).forEach(function (rule) {
      if (rule && rule.id) rulesById[rule.id] = rule;
    });

    (config.answerOptions || []).forEach(function (option) {
      if (option.isUnknown === true) {
        ['changeFind', 'changeEffect'].forEach(function (field) {
          if (typeof option[field] !== 'string' || !option[field].trim()) {
            problems.push({ check: 'unknown option has ' + field, id: option.id });
          }
        });
      }
      if (option.triggersOverride && !rulesById[option.triggersOverride]) {
        problems.push({ check: 'triggersOverride names a rule in config', id: option.id + ' -> ' + option.triggersOverride });
      }
    });

    Object.keys(rulesById).forEach(function (id) {
      var functions = rulesById[id].functions;
      if (functions === undefined) return;
      var valid = Array.isArray(functions) && functions.length > 0 && functions.every(function (f) {
        return typeof f === 'string' && f.trim();
      });
      if (!valid) problems.push({ check: 'rule functions is a list of names', id: id });
    });

    return problems;
  }

  return { load: load, get: get, validate: validate };
})();
