/* ============================================================
   MultiNet v2.0 R1 - charts that carry the findings

   Each visual is attached to the claim it evidences:

   1. #r1-episode-grid   - all 150 episodes, one cell each.
   2. #r1-switch-funnel  - the discovery wall. Agents reach the
      switch and walk over it. Rendered as HTML rather than a
      chart because it is a drop-off, not a distribution.
   3. #r1-inversion-chart - what each maze property explains,
      across the whole set and on the short mazes alone.
   4. #r1-quarter-chart  - how the composition of an agent's
      actions shifts across an episode. Carries the three
      failure styles.
   5. #r1-thinking-chart - thinking spent per turn, log scale.

   They use the model brand colours so a reader can follow a
   model across the page.

   Data: static/data/v2_r1_results.json
   ============================================================ */
(function () {
  "use strict";

  var COLOUR = {
    "Claude Opus 4.8": "#D97757",
    "Kimi k2.6": "#111111",
    "Qwen3.6-27B": "#6950EF"
  };

  // ---- 0. every episode, as a grid ---------------------------------------
  // 50 mazes x 3 models, every maze ranked by BFS-min actions across the whole
  // set - the same ordering as the report's progress_grid_actions figure.
  //
  // It used to group by family and sort within each group, which put a 23-move
  // maze next to a 77-move one and made the "shorter -> longer" axis beneath
  // it false. Family and grid size are strips under the rows instead, so the
  // horizontal axis means exactly one thing: difficulty.
  var PROGRESS_BINS = [
    { max: 0.05, label: "<5%",    fill: "#e8f0fb" },
    { max: 0.10, label: "5-10%",  fill: "#bbd6f2" },
    { max: 0.20, label: "10-20%", fill: "#6ba3e0" },
    { max: 0.40, label: "20-40%", fill: "#2e6fbf" },
    { max: 1.01, label: "40%+",   fill: "#17427a" }
  ];
  var FAMILY = {
    S: { name: "S (scale)",      fill: "#7c4dff" },
    M: { name: "M (mechanism)",  fill: "#e8a33d" },
    D: { name: "D (distractor)", fill: "#d6457f" }
  };
  var SIZE = {
    8:  { name: "8\u00d78",   fill: "#e2e4e8" },
    10: { name: "10\u00d710", fill: "#9aa1ab" },
    14: { name: "14\u00d714", fill: "#4a5058" }
  };

  function binFor(v) {
    for (var i = 0; i < PROGRESS_BINS.length; i++) {
      if (v < PROGRESS_BINS[i].max) return PROGRESS_BINS[i];
    }
    return PROGRESS_BINS[PROGRESS_BINS.length - 1];
  }

  function renderGrid(data, el) {
    var g = data.episodeGrid;
    if (!g || !g.mazes) return;
    var n = g.mazes.length;

    var rows = g.models.map(function (model, mi) {
      var cells = g.mazes.map(function (m, i) {
        var v = m.v[mi];
        var solved = m.solved[mi];
        var bin = binFor(v);
        var title = "#" + (i + 1) + "  " + m.id + " \u00b7 " + m.grid + "\u00d7" + m.grid +
                    " \u00b7 " + m.optimal + " optimal actions \u00b7 progress " + v.toFixed(2) +
                    (solved ? " \u00b7 SOLVED" : "");
        return '<span class="r1-eg__cell' + (solved ? " is-solved" : "") +
               '" style="--f:' + bin.fill + '" title="' + title + '">' +
               (solved ? "&#9733;" : "") + "</span>";
      }).join("");
      return '<div class="r1-eg__label">' + model + "</div>" +
             '<div class="r1-eg__row">' + cells + "</div>";
    }).join("");

    function strip(kind, key, map) {
      var cells = g.mazes.map(function (m) {
        var d = map[m[key]] || { name: "?", fill: "#ddd" };
        return '<span class="r1-eg__seg" style="--f:' + d.fill + '" title="' + d.name + '"></span>';
      }).join("");
      return '<div class="r1-eg__label r1-eg__label--strip">' + kind + "</div>" +
             '<div class="r1-eg__strip">' + cells + "</div>";
    }

    // Ticks at the ranks the report labels, each carrying its BFS-min value so
    // the axis is readable without a second lookup.
    var ticks = [1, 10, 20, 30, 40, n].map(function (r) {
      var m = g.mazes[r - 1];
      return '<span class="r1-eg__tick" style="--at:' + ((r - 0.5) / n * 100) + '%">' +
        "<b>" + r + "</b><i>(" + m.optimal + ")</i></span>";
    }).join("");

    function key(map, order) {
      return order.map(function (k) {
        return '<span class="r1-eg__k"><i style="background:' + map[k].fill + '"></i>' +
               map[k].name + "</span>";
      }).join("");
    }

    el.innerHTML =
      '<div class="r1-eg">' +
        rows +
        strip("family", "family", FAMILY) +
        strip("size", "grid", SIZE) +
        '<div class="r1-eg__label"></div>' +
        '<div class="r1-eg__axis">' + ticks +
          '<span class="r1-eg__axistitle">maze rank (BFS-min actions at tick)</span>' +
        "</div>" +
      "</div>" +
      '<div class="r1-eg__key">' +
        '<span class="r1-eg__kgroup">progress ' +
          PROGRESS_BINS.map(function (b) {
            return '<span class="r1-eg__k"><i style="background:' + b.fill + '"></i>' + b.label + "</span>";
          }).join("") +
          '<span class="r1-eg__k"><i class="r1-eg__kstar">&#9733;</i>solve</span>' +
        "</span>" +
        '<span class="r1-eg__kgroup">' + key(FAMILY, ["S", "M", "D"]) + "</span>" +
        '<span class="r1-eg__kgroup">' + key(SIZE, [8, 10, 14]) + "</span>" +
      "</div>";
  }

  // ---- 1. mechanism discovery funnels -------------------------------------
  // Two funnels rather than a funnel and a list. The claim is a comparison -
  // the same models discover one mechanism and never discover the other - so
  // both sides need identical geometry and a shared scale, or the eye cannot
  // compare them. They also count the same unit: episodes, not events.
  function renderFunnel(data, el) {
    var f = data.switchFunnel;
    if (!f || !f.funnels) return;
    var max = f.scaleMax || Math.max.apply(null, f.funnels.map(function (c) {
      return c.steps[0].value;
    }));

    var cols = f.funnels.map(function (col) {
      var steps = col.steps.map(function (s, i) {
        var pct = (s.value / max) * 100;
        return "" +
          '<div class="r1-fn__step' + (s.value === 0 ? " is-zero" : "") + '">' +
            '<div class="r1-fn__label">' + s.label + "</div>" +
            '<div class="r1-fn__track">' +
              // A floor width so a value of 2 is still a visible mark rather
              // than a hairline that reads as a rendering fault.
              '<span class="r1-fn__fill" style="--w:' + Math.max(pct, 0.9) + '%"></span>' +
              '<span class="r1-fn__value">' + s.value + "</span>" +
            "</div>" +
          "</div>";
      }).join('<div class="r1-fn__arrow" aria-hidden="true">&darr;</div>');

      return '<div class="r1-fn__col" style="--a: ' + col.accent + '">' +
        '<p class="r1-fn__title">' + col.name + "</p>" + steps +
      "</div>";
    }).join("");

    el.innerHTML = '<div class="r1-fn">' + cols + "</div>";
  }

  // ---- 2. progress vs shortest path --------------------------------------
  // ---- 3. how actions change across an episode ---------------------------
  function renderQuarters(data, canvas, buttonBar, noteEl) {
    if (!data.quarters || typeof Chart === "undefined") return;
    var q = data.quarters;
    var metric = "new";
    var chart = null;

    function draw() {
      var m = q.metrics[metric];
      if (chart) chart.destroy();
      chart = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: {
          labels: q.xLabels,
          datasets: q.series.map(function (s) {
            var c = COLOUR[s.model] || "#666";
            return {
              label: s.model,
              data: s[metric],
              borderColor: c,
              backgroundColor: c,
              pointRadius: 4,
              pointHoverRadius: 6,
              borderWidth: 2.5,
              tension: 0.25
            };
          })
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 350 },
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { labels: { usePointStyle: true, boxWidth: 8 } },
            tooltip: {
              callbacks: {
                label: function (ctx) { return ctx.dataset.label + ": " + ctx.parsed.y + "%"; }
              }
            }
          },
          scales: {
            x: { title: { display: true, text: "Position within the episode" }, grid: { display: false } },
            y: { beginAtZero: true, title: { display: true, text: "% of the agent's actions" },
                 grid: { color: "rgba(0,0,0,0.05)" } }
          }
        }
      });
      if (noteEl) noteEl.textContent = m.hint;
    }

    Object.keys(q.metrics).forEach(function (key) {
      var b = document.createElement("button");
      b.className = "r1-metric-button" + (key === metric ? " active" : "");
      b.textContent = q.metrics[key].label;
      b.addEventListener("click", function () {
        metric = key;
        Array.prototype.forEach.call(buttonBar.children, function (o) {
          o.classList.toggle("active", o === b);
        });
        draw();
      });
      buttonBar.appendChild(b);
    });

    draw();
  }

  // ---- 4. what each maze property explains, before and after the
  //         path-length term stops swamping it ------------------------------
  function renderInversion(data, canvas) {
    if (!data.inversion || typeof Chart === "undefined") return;
    var inv = data.inversion;
    var labels = inv.features.map(function (f) { return f.name; });

    new Chart(canvas.getContext("2d"), {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          { label: inv.series[0].label, data: inv.features.map(function (f) { return f.all; }),
            backgroundColor: "#cbd5e1", borderRadius: 3 },
          { label: inv.series[1].label, data: inv.features.map(function (f) { return f.short; }),
            backgroundColor: "#005A9C", borderRadius: 3 }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { usePointStyle: true, pointStyle: "rect", boxWidth: 10 } },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label + ": R² " + ctx.parsed.x.toFixed(2);
              }
            }
          }
        },
        scales: {
          x: { beginAtZero: true, title: { display: true, text: "R² - share of progress the property explains" },
               grid: { color: "rgba(0,0,0,0.05)" } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // ---- 5. thinking spent per turn ----------------------------------------
  function renderThinking(data, canvas) {
    if (!data.thinking || typeof Chart === "undefined") return;
    var t = data.thinking;

    new Chart(canvas.getContext("2d"), {
      type: "line",
      data: {
        labels: t.turns,
        datasets: t.series.map(function (s) {
          var c = COLOUR[s.model] || "#666";
          return {
            label: s.model, data: s.median,
            borderColor: c, backgroundColor: c,
            pointRadius: 0, pointHoverRadius: 4,
            borderWidth: 2.2, tension: 0.25
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { labels: { usePointStyle: true, boxWidth: 8 } },
          tooltip: {
            callbacks: {
              title: function (items) { return "Turn " + items[0].label; },
              label: function (ctx) {
                return ctx.dataset.label + ": " + ctx.parsed.y.toLocaleString() + " tokens";
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: "Turn within the episode" }, grid: { display: false } },
          y: { type: "logarithmic", title: { display: true, text: "Median thinking tokens" },
               grid: { color: "rgba(0,0,0,0.05)" } }
        }
      }
    });
  }

  function init() {
    var gridEl = document.getElementById("r1-episode-grid");
    var invEl = document.getElementById("r1-inversion-chart");
    var thinkEl = document.getElementById("r1-thinking-chart");
    var funnelEl = document.getElementById("r1-switch-funnel");
    var quarterEl = document.getElementById("r1-quarter-chart");
    if (!gridEl && !funnelEl && !quarterEl && !invEl && !thinkEl) return;

    var onHome = /\/(index\.html)?$/.test(window.location.pathname);
    // Versioned like the scripts are: the numbers change more often than the
    // code that draws them, and a cached copy of the old ones is invisible.
    var path = (onHome ? "static/data/" : "../data/") + "v2_r1_results.json?v=r2m";

    fetch(path)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (gridEl) renderGrid(data, gridEl);
        if (funnelEl) renderFunnel(data, funnelEl);
        if (quarterEl) {
          renderQuarters(data, quarterEl,
            document.getElementById("r1-quarter-metrics"),
            document.getElementById("r1-quarter-note"));
        }
        if (invEl) renderInversion(data, invEl);
        if (thinkEl) renderThinking(data, thinkEl);
      })
      .catch(function (err) { console.error("R1 finding charts:", err); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
