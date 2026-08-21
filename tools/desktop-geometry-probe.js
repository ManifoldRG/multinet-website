/* ============================================================
   Desktop regression probe.

   Mobile work is supposed to be invisible above the breakpoint.
   This takes a geometry fingerprint of the page so "desktop is
   unchanged" can be measured instead of asserted: run it before a
   change, run it after, diff the two files.

   Usage - paste into the console on the page at a desktop width,
   or evaluate via a browser-automation tool, then save the JSON:

     node tools/compare-geometry.js before.json after.json

   Only geometry and the computed properties that drive it are
   captured; text content is deliberately ignored so copy edits do
   not read as layout regressions.
   ============================================================ */
(function probe() {
  var r = function (n) { return Math.round(n * 100) / 100; };

  // Every element that takes part in layout, identified by a stable path
  // rather than by index alone, so an inserted node does not shift everything.
  function pathOf(el) {
    var parts = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      var name = el.tagName.toLowerCase();
      if (el.id) { parts.unshift(name + "#" + el.id); break; }
      var cls = (el.className || "").toString().trim().split(/\s+/)[0];
      var sib = 0, p = el.parentElement;
      if (p) {
        for (var i = 0; i < p.children.length; i++) {
          if (p.children[i] === el) break;
          if (p.children[i].tagName === el.tagName) sib++;
        }
      }
      parts.unshift(name + (cls ? "." + cls : "") + "[" + sib + "]");
      el = el.parentElement;
    }
    return parts.join(">");
  }

  var out = {
    viewport: document.documentElement.clientWidth + "x" + window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    elements: {}
  };

  var all = document.querySelectorAll("body *");
  for (var i = 0; i < all.length; i++) {
    var el = all[i];
    // Browser-automation extensions inject their own overlays (cursor, glow).
    // They are not the page, and they come and go between runs.
    if (/^claude-/.test(el.id || "")) continue;
    if (el.closest("[id^='claude-']")) continue;
    var box = el.getBoundingClientRect();
    if (!box.width && !box.height) continue;
    var cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    // absolute document coords, so scroll position does not matter
    out.elements[pathOf(el)] = [
      r(box.left + window.scrollX), r(box.top + window.scrollY),
      r(box.width), r(box.height),
      // No margin: "margin: 0 auto" resolves to a used value that Chrome
      // reports inconsistently between runs, which reads as a false diff.
      // Position and size already capture what auto margins actually do.
      cs.fontSize, cs.padding, cs.whiteSpace, cs.overflowX
    ].join("|");
  }
  out.elementCount = Object.keys(out.elements).length;
  return out;
})()
