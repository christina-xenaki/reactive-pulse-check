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

  return { load: load, get: get };
})();
