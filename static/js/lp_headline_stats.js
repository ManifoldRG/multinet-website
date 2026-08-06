/* ============================================================
   MultiNet - landing page headline stats

   Counts each numerator up and fills its ratio rule, once, the
   first time the strip is on screen. The numbers are already in
   the markup, so with this script absent or JS off the strip is
   simply static and correct.

   Reads data-value / data-total off each .lp-stat.
   Styles: the .lp-stat block in index.html
   ============================================================ */
(function () {
  "use strict";

  var DURATION = 900;
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // decelerating, so the number settles rather than stopping dead
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  function reveal(stat) {
    var target = parseInt(stat.dataset.value, 10);
    var total = parseInt(stat.dataset.total, 10);
    var out = stat.querySelector(".v");
    var rule = stat.querySelector(".r");
    if (!out || isNaN(target)) return;

    if (rule && total) rule.style.setProperty("--p", target / total);

    // Nothing to count, and animating a zero to a zero just looks broken.
    if (still || target === 0) { out.textContent = target; return; }

    var t0 = null;
    function step(now) {
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / DURATION);
      out.textContent = Math.round(easeOut(p) * target);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function init() {
    var stats = [].slice.call(document.querySelectorAll(".lp-stat[data-value]"));
    if (!stats.length) return;

    if (!("IntersectionObserver" in window)) {
      stats.forEach(reveal);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);   // once only - a strip that replays on every
        reveal(e.target);         // scroll past turns into a distraction
      });
    }, { threshold: 0.5 });

    stats.forEach(function (s) { io.observe(s); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
