/* ============================================================
   MultiNet v2.0 R1 - headline chart

   Grouped bar chart sitting directly under the headline numbers.
   Lets a reader re-slice the same 149 episodes by shortest path
   length, grid size or maze family, and switch between solve rate
   and mean progress.

   The point of the default view: every solve sits in the leftmost
   band, and both metrics fall away monotonically as the shortest
   path gets longer.

   Data: static/data/v2_r1_results.json  ->  .charts
   ============================================================ */
(function () {
  "use strict";

  var COLOURS = {
    "Claude Opus 4.8": "#005A9C",
    "Kimi k2.6": "#1E8449",
    "Qwen3.6-27B": "#D35400"
  };

  var METRICS = {
    solveRate: {
      label: "Solve rate",
      axis: "Solve rate (%)",
      max: 40,
      fmt: function (v) { return v.toFixed(1) + "%"; }
    },
    progress: {
      label: "Mean progress",
      axis: "Mean progress score (0-1)",
      max: 0.6,
      fmt: function (v) { return v.toFixed(3); }
    }
  };

  var chart = null;
  var charts = null;
  var grouping = "path";
  var metric = "solveRate";

  function note(group) {
    var parts = group.pooled.map(function (p) {
      return p.bucket + ": " + p.solves + "/" + p.episodes;
    });
    return "Pooled across all three models - " + parts.join(" · ") +
           ". Bars show each model separately; hover for the episode counts behind every bar.";
  }

  function draw() {
    var group = charts[grouping];
    var m = METRICS[metric];
    var canvas = document.getElementById("r1-headline-chart");
    if (!canvas || !group) return;

    var datasets = group.series.map(function (s) {
      return {
        label: s.model,
        data: s[metric],
        backgroundColor: COLOURS[s.model] || "#666",
        borderRadius: 3,
        // carried through so the tooltip can show n and solves
        _episodes: s.episodes,
        _solves: s.solves
      };
    });

    if (chart) chart.destroy();
    chart = new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: { labels: group.buckets, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 350 },
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", labels: { boxWidth: 12, usePointStyle: true, pointStyle: "rect" } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                var d = ctx.dataset;
                var i = ctx.dataIndex;
                return d.label + ": " + METRICS[metric].fmt(ctx.parsed.y) +
                       "  (" + d._solves[i] + " solved of " + d._episodes[i] + " episodes)";
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: group.label }, grid: { display: false } },
          y: {
            beginAtZero: true,
            suggestedMax: m.max,
            title: { display: true, text: m.axis },
            grid: { color: "rgba(0,0,0,0.06)" }
          }
        }
      }
    });

    var el = document.getElementById("r1-chart-note");
    if (el) el.textContent = note(group);
  }

  function init() {
    var canvas = document.getElementById("r1-headline-chart");
    if (!canvas || typeof Chart === "undefined") return;

    var onHome = /\/(index\.html)?$/.test(window.location.pathname);
    var path = (onHome ? "static/data/" : "../data/") + "v2_r1_results.json";

    fetch(path)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        charts = data.charts;
        if (!charts) return;

        var select = document.getElementById("r1-chart-grouping");
        if (select) {
          select.addEventListener("change", function () {
            grouping = this.value;
            draw();
          });
        }

        var buttons = document.querySelectorAll("#r1-chart-metrics .r1-metric-button");
        buttons.forEach(function (b) {
          b.addEventListener("click", function () {
            metric = b.dataset.metric;
            buttons.forEach(function (o) { o.classList.toggle("active", o === b); });
            draw();
          });
        });

        draw();
      })
      .catch(function (err) {
        console.error("R1 headline chart:", err);
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
