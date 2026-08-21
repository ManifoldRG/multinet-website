/* ============================================================
   MultiNet - landing page headline stats

   Counts each numerator up and fills its ratio rule, once, the
   first time the strip is on screen.

   The markup already carries the final number and the final fill
   (--p), so the correct strip is what you get with this script
   absent, with JS off, or if the reveal never fires. This script
   only ever takes a correct strip, winds it back to zero, and
   plays it forward - it never supplies a value the page did not
   already have.

   Reads data-value / data-total off each .lp-stat.
   Styles: the .lp-stat block in index.html
   ============================================================ */
(function () {
  "use strict";

  var DURATION = 900;
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // decelerating, so the number settles rather than stopping dead
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

  // One dot per unit of the denominator, built once. Doing this in script
  // rather than markup keeps 305 spans out of the document source; the
  // numbers and labels are in the HTML, so the strip is still correct and
  // readable without it.
  function buildUnits(stat) {
    var grid = stat.querySelector(".u");
    var total = parseInt(stat.dataset.total, 10);
    if (!grid || !total || grid.childElementCount) return grid;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < total; i++) frag.appendChild(document.createElement("i"));
    grid.appendChild(frag);
    return grid;
  }

  function light(grid, n) {
    if (!grid) return;
    var dots = grid.children;
    for (var i = 0; i < dots.length; i++) {
      dots[i].classList.toggle("on", i < n);
    }
  }

  function reveal(stat) {
    var target = parseInt(stat.dataset.value, 10);
    var total = parseInt(stat.dataset.total, 10);
    var out = stat.querySelector(".v");
    var grid = buildUnits(stat);

    if (!out || isNaN(target)) { light(grid, target || 0); return; }

    function settle() { out.textContent = target; light(grid, target); }

    // Animating a zero to a zero just looks broken.
    if (target === 0) { settle(); return; }

    var done = false;
    var t0 = null;
    function step(now) {
      if (done) return;
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / DURATION);
      var v = Math.round(easeOut(p) * target);
      out.textContent = v;
      light(grid, v);
      if (p < 1) requestAnimationFrame(step);
      else done = true;
    }
    requestAnimationFrame(step);

    // Whatever happens to the frame budget - a throttled tab, a loaded
    // machine - the real number is on screen by the time the animation
    // should have ended. A counter parked mid-count shows a wrong number,
    // which is worse than showing no animation at all.
    setTimeout(function () { if (!done) { done = true; settle(); } }, DURATION + 400);
  }

  function arm(stats) {
    // Anything already on screen is revealed where it stands. Winding it back
    // would park a wrong number in front of someone who has not scrolled -
    // the observer's threshold is half the card, so a strip peeking above the
    // fold would sit at 0 until they did.
    var pending = [];
    stats.forEach(function (s) {
      if (s.getBoundingClientRect().top < window.innerHeight) { reveal(s); return; }
      var out = s.querySelector(".v");
      if (out) out.textContent = "0";
      light(buildUnits(s), 0);
      pending.push(s);
    });
    if (!pending.length) return;
    stats = pending;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);   // once only - a strip that replays on every
        reveal(e.target);         // scroll past turns into a distraction
      });
    }, { threshold: 0.5 });

    stats.forEach(function (s) { io.observe(s); });
  }

  function init() {
    var stats = [].slice.call(document.querySelectorAll(".lp-stat[data-value]"));

    if (!stats.length) return;

    // Build every grid at its finished state first, whatever happens next.
    // The structure is not an animation and should never wait on one - if it
    // did, an unpainted tab would show three empty boxes.
    stats.forEach(function (s) {
      light(buildUnits(s), parseInt(s.dataset.value, 10) || 0);
    });

    if (still || !("IntersectionObserver" in window)) return;

    // Only the count-up waits. A hidden tab neither paints nor reports
    // intersections, so arming one would wind the numbers back to zero and
    // leave them there until someone looked.
    if (document.hidden) {
      document.addEventListener("visibilitychange", function once() {
        if (document.hidden) return;
        document.removeEventListener("visibilitychange", once);
        arm(stats);
      });
      return;
    }

    arm(stats);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
