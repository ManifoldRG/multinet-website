/* ============================================================
   MultiNet v2.0 R1 - results table

   Deliberately NOT a leaderboard. R1 produced 6 solves across 149
   valid episodes, which is far too few to rank three models, and
   the ordering flips depending on which metric you read: Claude
   leads on success and comes last on progress. The table therefore
   shows every reported metric side by side, in a fixed order, with
   no ranks, medals or "wins" column.

   Data: static/data/v2_r1_results.json
   ============================================================ */
(function () {
  "use strict";

  function fmt(n, dp) { return Number(n).toFixed(dp); }

  function render(data, container) {
    var run = data.run;
    var models = data.models;

    var rows = models.map(function (m) {
      var tokens = (m.tokensLowerBound ? "≥" : "") + m.tokensPerNewTile.toLocaleString();
      var ended = [
        m.stallKills + " stalled",
        m.capKills ? m.capKills + " hit the step cap" : null,
        m.infraTerminated ? m.infraTerminated + " infra" : null
      ].filter(Boolean).join(", ");

      return "" +
        "<tr>" +
          '<td class="r1-model">' + m.name + "</td>" +
          '<td><span class="r1-big">' + m.solved + "</span>" +
             '<span class="r1-sub"> / ' + m.episodes + "</span></td>" +
          '<td><span class="r1-big">' + fmt(m.progressMean, 2) + "</span>" +
             '<span class="r1-sub"> median ' + fmt(m.progressMedian, 2) + "</span></td>" +
          '<td><span class="r1-big">' + fmt(m.stepsMean, 1) + "</span>" +
             '<span class="r1-sub"> ± ' + fmt(m.stepsSd, 1) + "</span></td>" +
          "<td>" + tokens + "</td>" +
          "<td>" + fmt(m.noEffectRate, 2) + "</td>" +
          '<td class="r1-ended">' + ended + "</td>" +
        "</tr>";
    }).join("");

    container.innerHTML = "" +
      '<div class="r1-table-wrap">' +
        '<table class="r1-table">' +
          "<thead><tr>" +
            "<th>Model</th>" +
            '<th>Solved<span class="r1-hint">reached the goal</span></th>' +
            '<th>Progress<span class="r1-hint">share of the distance closed</span></th>' +
            '<th>Steps to termination<span class="r1-hint">mean ± SD</span></th>' +
            '<th>Tokens per new tile<span class="r1-hint">pooled</span></th>' +
            '<th>Actions with no effect<span class="r1-hint">pooled rate</span></th>' +
            "<th>How episodes ended</th>" +
          "</tr></thead>" +
          "<tbody>" + rows + "</tbody>" +
        "</table>" +
      "</div>" +
      '<p class="r1-table-note">' +
        run.mazes + " mazes × " + run.models + " models = " + run.episodes +
        " episodes, " + run.validEpisodes + " valid. Every model ran under the same protocol " +
        "and the same " + run.tokenBudget + ". Kimi token counts are lower bounds: a provider " +
        "incident left usage fields missing on some turns." +
      "</p>";
  }

  function init() {
    var container = document.getElementById("r1-results-container");
    if (!container) return;

    var onHome = /\/(index\.html)?$/.test(window.location.pathname);
    var path = (onHome ? "static/data/" : "../data/") + "v2_r1_results.json";

    fetch(path)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) { render(data, container); })
      .catch(function (err) {
        container.innerHTML =
          '<div class="notification is-danger">Could not load R1 results: ' + err.message + "</div>";
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
