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

  function bar(value, max, cls) {
    var pct = Math.max(0, Math.min(100, (value / max) * 100));
    return '<span class="r1-bar ' + (cls || "") + '"><span style="--w:' + pct + '%"></span></span>';
  }

  function render(data, container, assetBase) {
    var models = data.models;

    // scale every bar against the strongest value in its own column
    var maxSteps = Math.max.apply(null, models.map(function (m) { return m.stepsMean; }));
    var maxTokens = Math.max.apply(null, models.map(function (m) { return m.tokensPerNewTile; }));

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
          '<div class="r1-rc__metric">' +
            "<dt>Average progress</dt>" +
            "<dd>" + bar(m.progressMean, 1) + '<span class="v">' + fmt(m.progressMean, 2) + "</span></dd>" +
          "</div>" +
          '<div class="r1-rc__metric">' +
            "<dt>Average steps before the episode ended</dt>" +
            "<dd>" + bar(m.stepsMean, maxSteps) + '<span class="v">' + fmt(m.stepsMean, 1) + "</span></dd>" +
          "</div>" +
          '<div class="r1-rc__metric">' +
            "<dt>Tokens per new tile reached</dt>" +
            "<dd>" + bar(m.tokensPerNewTile, maxTokens) + '<span class="v">' + tokens + "</span></dd>" +
          "</div>" +
          '<div class="r1-rc__metric">' +
            "<dt>Actions that changed nothing</dt>" +
            "<dd>" + bar(m.noEffectRate, 1) + '<span class="v">' +
              Math.round(m.noEffectRate * 100) + "%</span></dd>" +
          "</div>" +
        "</dl>" +

        '<div class="r1-rc__foot">' + ended + "</div>" +
      "</div>";
    }).join("");

    container.innerHTML = '<div class="r1-results">' + cards + "</div>";
  }

  function init() {
    var container = document.getElementById("r1-results-container");
    if (!container) return;

    var onHome = /\/(index\.html)?$/.test(window.location.pathname);
    var path = (onHome ? "static/data/" : "../data/") + "v2_r1_results.json";
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
