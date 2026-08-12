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
      // Prose rather than a one-line claim: this tab has to say what the two
      // mechanisms are before its figure means anything.
      claimHtml:
        "<p>The key-door mechanism is familiar to frontier models as they have surely seen it " +
        "during training. However, a switch in this environment is represented as a colored circle " +
        "on a cell in the maze, while the gate is represented as a blocked cell. The model has to " +
        "learn from experience which switch opens which gate, and that operating it means standing " +
        "on that exact cell and toggling. Across the 105 switch-maze episodes a switch was pressed " +
        "twice, both times by the same model, and no maze with a switch was solved by anyone - " +
        "while key-door mazes account for four of the six solves.</p>",
      mount: "r1-switch-funnel",
      caption: "Models walked onto a live switch in 38 of the 105 switch-maze episodes, and pressed one " +
               "in 2 of them."
    },
    {
      id: "difficulty",
      label: "Difficulty axes",
      claim: "Optimal path length to solve the maze is a dominant factor in deciding how much " +
             "progress a model makes in a given maze. However, when restricted to the 69 episodes " +
             "where the optimal path length is 45 moves or fewer, the influence of gates and " +
             "switches rises as the influence of the path length falls.",
      mount: "r1-inversion-chart",
      caption: "How much of the variation in progress each maze property explains on its own, with " +
               "the model held constant."
    },
    {
      id: "styles",
      label: "Failure styles",
      claim: "The stall watchdog ends 139 of the 144 failed episodes, but each model behaves " +
             "differently in the environment and fails in its own way. Claude walks into walls, " +
             "Kimi retreads ground it has covered, Qwen turns on the spot.",
      mount: "r1-quarter-chart",
      // this figure writes its own caption, per selected view
      caption: ""
    },
    {
      id: "compute",
      label: "Test time compute",
      claim: "Kimi and Qwen spend roughly 20 and 26 times more output tokens per newly discovered tile " +
             "than Claude, last around 1.6x as many steps, and solve fewer mazes. Claude's thinking " +
             "roughly halves over the course of an episode, Kimi's roughly doubles, and Qwen's stays " +
             "flat at around 16,000 tokens a turn.",
      mount: "r1-thinking-chart",
      caption: "Estimated thinking spent on each turn, by turn number. The scale is logarithmic - each " +
               "gridline multiplies the one below it rather than adding to it - because Claude runs " +
               "close to two orders of magnitude under the other two. Per turn, not the per-tile ratio " +
               "in the cards above."
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

      // A one-line claim sits centred over its figure; a tab that has to
      // explain itself first gets prose, which only reads left-aligned.
      var claim = panel.querySelector(".r1-tab__claim");
      claim.classList.toggle("is-prose", !!tab.claimHtml);
      if (tab.claimHtml) claim.innerHTML = tab.claimHtml;
      else claim.textContent = tab.claim;

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
