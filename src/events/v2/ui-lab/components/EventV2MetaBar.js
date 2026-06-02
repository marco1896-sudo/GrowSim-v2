'use strict';

(function initEventV2MetaBar(globalScope) {
  function renderMetaBar(scenario) {
    return (
      '<div class="event-v2-meta-bar">' +
      '<span class="chip setup">' + scenario.setup + '</span>' +
      '<span class="chip stage">' + scenario.stage + '</span>' +
      '<span class="chip severity">' + scenario.severity + '</span>' +
      '<span class="chip category">' + scenario.category + '</span>' +
      '</div>'
    );
  }

  globalScope.EventV2MetaBar = Object.freeze({ renderMetaBar });
})(typeof globalThis !== 'undefined' ? globalThis : window);

