/* IBI pages v20.26 (16 Nov 2026) - shared by /software/ and /ebooks/.
   Founder 16 Nov 2026: "Show as Rupee if somebody sees from India. Show in USD if someone views from outside India."
   Region rule = the same one IBI Apps checkout uses (IBI Apps saas.js guessRegion): an Indian time zone or a
   browser language ending in -IN means India; anything else with a time zone means outside India.
   The visitor can switch it (India / Other countries); the choice is remembered on this device only.
   Load it in <head> WITHOUT defer, so data-region is set before the page paints (no flash of the wrong price). */
(function () {
  'use strict';
  var VERSION = 'v20.26';
  var KEY = 'ibi:region';
  var root = document.documentElement;

  function guess() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (/Kolkata|Calcutta/.test(tz)) return 'IN';
      if ((navigator.language || '').toLowerCase().slice(-3) === '-in') return 'IN';
      return tz ? 'INTL' : 'IN';
    } catch (e) { return 'IN'; }
  }
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) {}
  root.setAttribute('data-region', saved === 'IN' || saved === 'INTL' ? saved : guess());

  function paint() {
    var r = root.getAttribute('data-region');
    var btns = document.querySelectorAll('[data-set-region]');
    for (var i = 0; i < btns.length; i++) btns[i].setAttribute('aria-pressed', String(btns[i].getAttribute('data-set-region') === r));
  }
  function set(r) {
    if (r !== 'IN' && r !== 'INTL') return;
    root.setAttribute('data-region', r);
    try { localStorage.setItem(KEY, r); } catch (e) {}
    paint();
  }
  window.IBIRegion = { get: function () { return root.getAttribute('data-region'); }, set: set, version: VERSION };

  function ready() {
    var v = document.getElementById('ibiVer');
    if (v) { v.textContent = VERSION; v.title = 'IBI Marketplace ' + VERSION; }
    document.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-set-region]') : null;
      if (b) { e.preventDefault(); set(b.getAttribute('data-set-region')); }
    });
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
