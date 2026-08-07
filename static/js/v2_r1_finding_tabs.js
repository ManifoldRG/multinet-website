/* ============================================================
   MultiNet v2.0 R1 - findings, as tabs

   The landing page has roughly two minutes of a visitor's
   attention. Four findings stacked vertically spend most of that
   on scrolling, so they share one panel instead: pick a finding,
   get a short claim and the figure that evidences it.

   Each tab reuses a chart already defined in
   v2_r1_finding_charts.js by moving that chart's container into
   the panel, so there is exactly one implementation of each
   figure across the site.

   Markup expected:
     <div id="r1-tabs"></div>          <- tab strip
     <div id="r1-tab-panel"></div>     <- claim + figure
   ============================================================ */
(function () {
  "use strict";

  var TABS = [
    {
      id: "discovery",
      label: "Exploration failure",
      claim: "Models operate the familiar mechanism competently and never acquire the unfamiliar one. " +
             "The gap is not knowledge of an interface, it is the ability to acquire an affordance by " +
             "interacting with the world.",
      mount: "r1-switch-funnel",
      caption: "Agents walked onto a live switch in 38 of the 105 switch-maze episodes and pressed it twice."
    },
    {
      id: "difficulty",
      label: "Environment factors",
      claim: "Distance and mechanisms both predict how far an agent gets, and on the mazes short " +
             "enough to leave headroom the mechanisms take over entirely: gates and switches each " +
             "explain around a quarter of the variation, while shortest path explains almost none.",
      mount: "r1-inversion-chart",
      caption: "How much of the variation in progress each maze property explains on its own."
    },
    {
      id: "styles",
      label: "Failure styles",
      claim: "All three models end essentially every episode on the stall watchdog, by different routes. " +
             "Claude walks into walls, Kimi retreads ground it has covered, Qwen turns on the spot. " +
             "Whatever each does too much of, it does more of as the episode runs.",
      mount: "r1-quarter-chart",
      // this figure writes its own caption, per selected view
      caption: ""
    },
    {
      id: "compute",
      label: "Test time compute",
      claim: "Kimi and Qwen spend 20 to 26 times more output tokens per newly discovered tile than " +
             "Claude, last around 1.6× longer, and solve fewer mazes. Claude's thinking contracts as an " +
             "episode runs, and contracts hardest right after a move that achieved nothing.",
      mount: "r1-thinking-chart",
      caption: "Median thinking tokens by turn, on a log scale."
    }
  ];

  function init() {
    var strip = document.getElementById("r1-tabs");
    var panel = document.getElementById("r1-tab-panel");
    if (!strip || !panel) return;

    // Each figure is built once, off-screen, by v2_r1_finding_charts.js.
    // Park them here and move the active one into the panel.
    var store = document.getElementById("r1-tab-figures");
    var current = null;

    function show(tab) {
      if (current === tab.id) return;
      current = tab.id;

      Array.prototype.forEach.call(strip.children, function (b) {
        b.classList.toggle("is-active", b.dataset.tab === tab.id);
      });

      // return whatever is showing to the store, then take this tab's figure
      var showing = panel.querySelector("[data-figure]");
      if (showing && store) store.appendChild(showing);

      var fig = store && store.querySelector('[data-figure="' + tab.mount + '"]');
      var slot = panel.querySelector(".r1-tab__figure");
      panel.querySelector(".r1-tab__claim").textContent = tab.claim;
      panel.querySelector(".r1-tab__caption").textContent = tab.caption;
      if (fig && slot) slot.appendChild(fig);

      // Chart.js sizes to its container; a chart built while hidden needs a nudge.
      if (window.Chart && window.Chart.getChart) {
        panel.querySelectorAll("canvas").forEach(function (c) {
          var inst = window.Chart.getChart(c);
          if (inst) inst.resize();
        });
      }
    }

    TABS.forEach(function (t) {
      var b = document.createElement("button");
      b.className = "r1-tab";
      b.dataset.tab = t.id;
      b.textContent = t.label;
      b.addEventListener("click", function () { show(t); });
      strip.appendChild(b);
    });

    // Charts render asynchronously after their fetch resolves, so wait a beat
    // before claiming the first figure.
    setTimeout(function () { show(TABS[0]); }, 350);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
