// Responsibility: small DOM helper utilities (element creation, selection,
// attribute and class helpers) shared by the other modules. No question
// content, scoring or copy lives here.

window.PulseCheck = window.PulseCheck || {};

PulseCheck.Dom = (function () {
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (name) {
      var value = attrs[name];
      if (value === undefined || value === null || value === false) return;
      if (name === 'className') {
        node.className = value;
      } else if (name === 'text') {
        node.textContent = value;
      } else {
        node.setAttribute(name, value);
      }
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  return { el: el, clear: clear, qs: qs, qsa: qsa };
})();
