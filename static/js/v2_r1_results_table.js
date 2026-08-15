/* ============================================================
   MultiNet v2.0 R1 - results table

   Deliberately NOT a leaderboard. R1 produced 6 solves across 150
   episodes, which is far too few to rank three models, and
   the ordering flips depending on which metric you read: Claude
   leads on success and comes last on progress. The table therefore
   shows every reported metric side by side, in a fixed order, with
   no ranks, medals or "wins" column.

   Data: static/data/v2_r1_results.json
   ============================================================ */
(function () {
  "use strict";

  function fmt(n, dp) { return Number(n).toFixed(dp); }

  // Brand marks, so each model card is identifiable at a glance.
  var BRAND = {
    "Claude Opus 4.8": { colour: "#D97757", logo: "claude.svg" },
    "Kimi k2.6":       { colour: "#000000", logo: "kimi.svg" },
    "Qwen3.6-27B":     { colour: "#6950EF", logo: "qwen.svg" }
  };

  // Every bar is a share of a denominator, and every denominator is named in
  // the definitions panel. Unlabelled bars were the original problem: two of
  // them filled against the largest of three models, which read as a ceiling
  // that does not exist.
  function bar(value, max) {
    var pct = Math.max(0, Math.min(100, (value / max) * 100));
    return '<span class="r1-bar"><span style="--w:' + pct + '%"></span></span>';
  }

  // The label is the affordance: clicking it opens the shared definitions
  // panel and lights the matching entry, so a formula is one click from the
  // number it explains without putting four formulae on the landing page.
  function metric(key, label, viz, value) {
    return '<div class="r1-rc__metric">' +
      '<dt><button type="button" class="r1-rc__what" data-metric="' + key + '">' +
        label + '<span class="is-sr">- show the formula</span>' +
      "</button></dt>" +
      "<dd>" + viz + '<span class="v">' + value + "</span></dd>" +
    "</div>";
  }


  // ---- Definitions -------------------------------------------------------
  // Same four metrics, in card order, each with the formula that produced the
  // number above it. Collapsed by default: a visitor who trusts the numbers
  // never has to read a formula, and one who does not is one click away.
  var DEFS = [
    {
      key: "progress",
      title: "Average progress",
      body: "How much of the work the agent got through before the episode ended, averaged over " +
            "all 50 mazes. Distance is counted in actions still needed to solve, and it tracks the " +
            "mechanism state: picking up the right key or opening a door lowers the remaining cost " +
            "even if the agent has not moved.",
      formula: 'Progress = 1 &minus; <span class="frac"><span class="top">actions still needed at the end</span>' +
               '<span class="bot">actions needed at the start</span></span>',
      denom: "1",
      scale: "The whole solution, so the bar is the share of it completed. Measured in actions rather than tiles: a tile metric pays an agent for standing near a goal behind a door it never opened."
    },
    {
      key: "steps",
      title: "Average steps before the episode ended",
      body: "Actions taken before the episode was cut off, averaged over 50 mazes. Almost every " +
            "episode ends on the stall watchdog, which fires after 30 consecutive steps with no " +
            "change in position, inventory or mechanism state. It is not tiles alone: picking up a " +
            "key or opening a door re-arms the counter, so an agent can revisit old ground and " +
            "still survive.",
      formula: 'Steps = <span class="frac"><span class="top">actions taken across all episodes</span>' +
               '<span class="bot">episodes</span></span>',
      denom: "173.5 steps",
      scale: "The average step budget: the cap is 3&times; the BFS optimum, and that optimum " +
             "averages 57.8 tiles over the 50 mazes. No model spends even 40% of it, because the " +
             "watchdog ends the episode first."
    },
    {
      key: "tokens",
      title: "Tokens per new tile reached",
      body: "Output tokens spent for each previously unseen tile the agent reached - what one " +
            "unit of exploration cost. It is the sharpest separator in the run: Kimi and Qwen " +
            "spend 20 to 26 times what Claude does, and solve fewer mazes.",
      formula: 'Cost = <span class="frac"><span class="top">output tokens generated</span>' +
               '<span class="bot">new tiles reached</span></span>',
      denom: "162k (Kimi)",
      scale: "The only metric here with no real ceiling, so it fills against the heaviest of the " +
             "three. The 64k cap is per turn - the most a model may generate in one reply - while " +
             "this totals every turn in the episode, so it runs far past it."
    },
    {
      key: "noeffect",
      title: "Actions that changed nothing",
      body: "The share of actions that left the world exactly as it was: walking into a wall, " +
            "picking up nothing, toggling nothing. Turning on the spot counts, which is why " +
            "Claude&rsquo;s figure is the highest of the three.",
      formula: 'No-effect rate = <span class="frac"><span class="top">actions leaving the state unchanged</span>' +
               '<span class="bot">actions taken</span></span>',
      denom: "1",
      scale: "Every action taken, so the bar is the share that did nothing."
    }
  ];

  function defsPanel() {
    // Each entry reads top to bottom in one order: what it is, the formula,
    // then what the bar fills against. The bar is the thing people ask about,
    // so it gets a labelled row of its own rather than a trailing sentence.
    var items = DEFS.map(function (d) {
      return '<div class="r1-mdef" id="mdef-' + d.key + '">' +
        '<h4 class="r1-mdef__title">' + d.title + "</h4>" +
        '<p class="r1-mdef__body">' + d.body + "</p>" +
        '<div class="r1-formula">' + d.formula + "</div>" +
        '<div class="r1-mdef__scale">' +
          '<span class="r1-mdef__scale-k">Bar fills against</span>' +
          '<span class="r1-mdef__scale-v">' + d.denom + "</span>" +
          '<p class="r1-mdef__scale-n">' + d.scale + "</p>" +
        "</div>" +
      "</div>";
    }).join("");

    return '<details class="r1-mdefs" id="r1-metric-defs">' +
      '<summary><span class="r1-mdefs__btn">Show the formulae</span></summary>' +
      '<div class="r1-mdefs__grid">' + items + "</div>" +
    "</details>";
  }

  function wireLabels(container) {
    container.addEventListener("click", function (e) {
      var btn = e.target.closest(".r1-rc__what");
      if (!btn) return;
      var panel = document.getElementById("r1-metric-defs");
      var target = document.getElementById("mdef-" + btn.dataset.metric);
      if (!panel || !target) return;

      panel.open = true;
      target.scrollIntoView({ block: "nearest", behavior: "smooth" });

      // a brief highlight, so it is obvious which of the four answered the click
      container.querySelectorAll(".r1-mdef.is-lit").forEach(function (el) {
        el.classList.remove("is-lit");
      });
      // restart the animation even when the same label is clicked twice
      void target.offsetWidth;
      target.classList.add("is-lit");
    });
  }

  function render(data, container, assetBase) {
    var models = data.models;

    // Steps run against the actual budget an episode is given: the cap is 3x
    // the BFS optimum, and the optimum averages 57.8 tiles over the 50 mazes.
    // Every model stops well short of it, because the stall watchdog fires
    // first - which is the point the bar should make.
    var STEP_BUDGET = 173.5;

    // A token ratio has no such ceiling, so this one is explicitly relative to
    // the heaviest of the three and says so in the panel.
    var maxTokens = Math.max.apply(null, models.map(function (m) {
      return m.tokensPerNewTile;
    }));

    var cards = models.map(function (m) {
      var b = BRAND[m.name] || { colour: "#64748b", logo: null };
      var tokens = (m.tokensLowerBound ? "≥" : "") + Math.round(m.tokensPerNewTile / 1000) + "k";
      var ended = [
        m.stallKills + " stalled",
        m.capKills ? m.capKills + " hit the step cap" : null
      ].filter(Boolean).join(" · ");

      var mark = b.logo
        ? '<span class="r1-rc__logo" style="--logo:url(\'' + assetBase + "images/logos/" + b.logo + '\')"></span>'
        : "";

      return "" +
      '<div class="r1-rc" style="--c:' + b.colour + '">' +
        '<div class="r1-rc__head">' + mark + "<h4>" + m.name + "</h4></div>" +

        '<div class="r1-rc__hero">' +
          '<span class="r1-rc__hero-num">' + m.solved + '<span class="den">/' + m.episodes + "</span></span>" +
          '<span class="r1-rc__hero-lab">mazes solved</span>' +
        "</div>" +

        '<dl class="r1-rc__metrics">' +
          metric("progress", "Average progress",
                 bar(m.progressMean, 1), fmt(m.progressMean, 2)) +
          metric("steps", "Average steps before the episode ended",
                 bar(m.stepsMean, STEP_BUDGET), fmt(m.stepsMean, 1)) +
          metric("tokens", "Tokens per new tile reached",
                 bar(m.tokensPerNewTile, maxTokens), tokens) +
          metric("noeffect", "Actions that changed nothing",
                 bar(m.noEffectRate, 1), Math.round(m.noEffectRate * 100) + "%") +
        "</dl>" +

        '<div class="r1-rc__foot">' + ended + "</div>" +
      "</div>";
    }).join("");

    container.innerHTML = '<div class="r1-results">' + cards + "</div>" + defsPanel();
    wireLabels(container);
  }

  function init() {
    var container = document.getElementById("r1-results-container");
    if (!container) return;

    var onHome = /\/(index\.html)?$/.test(window.location.pathname);
    // Versioned like the scripts are: the numbers change more often than the
    // code that draws them, and a cached copy of the old ones is invisible.
    var path = (onHome ? "static/data/" : "../data/") + "v2_r1_results.json?v=r2i";
    var assetBase = onHome ? "static/" : "../";

    fetch(path)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) { render(data, container, assetBase); })
      .catch(function (err) {
        container.innerHTML =
          '<div class="notification is-danger">Could not load R1 results: ' + err.message + "</div>";
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
