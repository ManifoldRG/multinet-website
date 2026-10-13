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
        "during training. However, a switch in this environment is represented as a circle " +
        "on a cell in the maze, while the gate is represented as a blocked cell. The model has to " +
        "learn from experience which switch opens which gate, and that operating it means standing " +
        "on that exact cell and toggling. Across the 175 switch-gate episodes of the five models a " +
        "switch was toggled twice, both times by Qwen 3.6-27B, and no maze with a switch was solved " +
        "by any model - while key-door mazes account for 17 of the 24 solves.</p>",
      mount: "r1-switch-funnel",
      caption: "Models walked onto a live switch in 67 of the 175 switch-gate episodes, but toggled " +
               "one successfully only in 2 of them."
    },
    {
      id: "difficulty",
      label: "Difficulty axes",
      claim: "For Claude Opus 4.8, Kimi K2.6 and Qwen 3.6-27B, the optimal path length is a " +
             "dominant factor in how much progress they make in a maze, explaining 11% to 21% of the " +
             "variation. For GPT-6 Astra and Claude Opus 5.5 it explains 2% and 0.3%: Astra solves " +
             "three 14x14 mazes of 77 to 85 actions and Opus 5.5 four of 77 to 89, while both still " +
             "solve none of the 35 mazes with a switch.",
      mount: "r1-horizon-chart",
      caption: "Share of the variation in each model's progress explained by the shortest-path length " +
               "of the maze alone, from one fit per model over its 50 episodes."
    },
    {
      id: "styles",
      label: "Failure styles",
      claim: "The stall watchdog, which ends an episode after 30 consecutive steps with no change " +
             "in position, inventory or mechanism state, accounts for 221 of the 226 failed " +
             "episodes. But each model behaves differently in the environment and fails in its own " +
             "way. Claude Opus 4.8 walks into walls, Qwen turns on the spot, Kimi and GPT-6 Astra " +
             "retread ground they have covered, and Claude Opus 5.5 presses PICKUP at keys from the " +
             "adjacent square, which does nothing in this environment.",
      mount: "r1-quarter-chart",
      // this figure writes its own caption, per selected view
      caption: ""
    },
    {
      id: "compute",
      label: "Test time compute",
      claim: "Kimi and Qwen spend roughly 26 and 20 times more output tokens per newly discovered tile " +
             "than Claude Opus 4.8, last around 1.6x as many steps, and solve fewer mazes. GPT-6 Astra " +
             "and Claude Opus 5.5 spend the least of the five, 2,172 and 4,504 tokens per new tile, and " +
             "solve the most. Claude Opus 4.8's thinking roughly halves over the course of an episode, " +
             "Kimi's, Astra's and Opus 5.5's roughly double, and Qwen's stays flat at around 16,000 " +
             "tokens a turn.",
      mount: "r1-thinking-chart",
      caption: "Median thinking tokens spent on each turn, by turn number, on a log scale. GPT-6 Astra " +
               "and Claude Opus 5.5 are exact provider counts; Claude Opus 4.8, Kimi K2.6 and Qwen " +
               "3.6-27B are estimates (dashed)."
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

      var claim = panel.querySelector(".r1-tab__claim");
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
