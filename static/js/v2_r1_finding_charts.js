/* ============================================================
   MultiNet v2.0 R1 - charts that carry the findings

   Three visuals, each attached to the claim it evidences:

   1. #r1-switch-funnel  - the discovery wall. Agents reach the
      switch and walk over it. Rendered as HTML rather than a
      chart because it is a drop-off, not a distribution.
   2. #r1-scatter-chart  - every episode against shortest path,
      with solves marked. Shows the one verified difficulty axis.
   3. #r1-quarter-chart  - how the composition of an agent's
      actions shifts across an episode. Carries both "it gets
      worse, not better" and the three failure styles.

   All three use the model brand colours so a reader can follow a
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
  // 50 mazes x 3 models. Colour is how much of the way to the goal the agent
  // got; a star marks a solve. Grouped by maze family, and within a family
  // ordered by shortest path, so the left-to-right fade is the difficulty axis.
  // What each maze family varies, for the hover on the grid's group headers.
  // Read off the run itself: S mazes carry no mechanisms at all, D mazes carry
  // the M mechanisms plus decoys, and B (switch-gate with no key) folds into M.
  var FAMILY_TIP = {
    Scale: "Plain navigation. No keys, doors, switches or gates - only the size and " +
           "density of the maze change.",
    Mechanism: "Barriers that have to be operated in the right order: keys open doors, " +
               "switches open gates. None of it is ever explained.",
    Distractor: "Mechanism mazes plus decoys - keys that fit no door, switches wired to " +
                "nothing, and corridors that lead nowhere."
  };

  function renderGrid(data, el) {
    var g = data.episodeGrid;
    if (!g) return;

    var families = [];
    g.mazes.forEach(function (m) {
      var last = families[families.length - 1];
      if (!last || last.name !== m.family) families.push({ name: m.family, count: 1 });
      else last.count++;
    });

    var head = families.map(function (f, i) {
      var tip = FAMILY_TIP[f.name] || "";
      // The last group sits at the right edge, so its tooltip has to open
      // leftwards or it runs off the grid.
      var side = i === families.length - 1 ? " is-last" : "";
      return '<div class="r1-eg__fam' + side + '" style="--span:' + f.count + '"' +
             (tip ? ' data-tip="' + tip + '"' : "") + ">" +
             '<button type="button" class="r1-eg__famlab">' + f.name +
             ' <span>' + f.count + "</span></button></div>";
    }).join("");

    var rows = g.models.map(function (model, mi) {
      var cells = g.mazes.map(function (m) {
        var v = m.v[mi];
        var solved = m.solved[mi];
        var title = m.id + " · " + m.family + " · " + m.grid + "x" + m.grid +
                    " · " + m.optimal + " moves · progress " + v.toFixed(2) +
                    (solved ? " · SOLVED" : "");
        return '<span class="r1-eg__cell' + (solved ? " is-solved" : "") +
               '" style="--v:' + v + '" title="' + title + '">' +
               (solved ? "&#9733;" : "") + "</span>";
      }).join("");
      return '<div class="r1-eg__label">' + model + "</div>" +
             '<div class="r1-eg__row">' + cells + "</div>";
    }).join("");

    el.innerHTML =
      '<div class="r1-eg">' +
        '<div class="r1-eg__label"></div><div class="r1-eg__fams">' + head + "</div>" +
        rows +
        '<div class="r1-eg__label"></div>' +
        '<div class="r1-eg__axis"><span>shorter mazes</span><span>longer mazes &rarr;</span></div>' +
      "</div>" +
      '<div class="r1-eg__key">' +
        "<span>less progress</span>" +
        '<span class="r1-eg__ramp"></span>' +
        "<span>more</span>" +
        '<span class="r1-eg__keystar">&#9733; solved</span>' +
      "</div>";
  }

  // ---- 1. switch discovery funnel ----------------------------------------
  function renderFunnel(data, el) {
    var f = data.switchFunnel;
    if (!f) return;
    var top = f.steps[0].value;

    var steps = f.steps.map(function (s, i) {
      var pct = (s.value / top) * 100;
      return "" +
        '<div class="r1-fn__step' + (s.value === 0 ? " is-zero" : "") + '">' +
          '<div class="r1-fn__label">' + s.label + "</div>" +
          '<div class="r1-fn__track">' +
            '<span class="r1-fn__fill" style="--w:' + pct + '%"></span>' +
            '<span class="r1-fn__value">' + s.value + "</span>" +
          "</div>" +
        "</div>";
    }).join('<div class="r1-fn__arrow">&darr;</div>');

    var contrast = f.contrast.map(function (c) {
      return '<li><span class="n">' + c.value + "</span>" + c.label + "</li>";
    }).join("");

    el.innerHTML =
      '<div class="r1-fn">' +
        '<div class="r1-fn__main">' +
          '<p class="r1-fn__title">Switch-gate mechanism</p>' +
          steps +
        "</div>" +
        '<div class="r1-fn__aside">' +
          '<p class="r1-fn__title">Key-door mechanisms</p>' +
          "<ul>" + contrast + "</ul>" +
          "<p>Keys and doors were explained exactly as much as switches were: not at all.</p>" +
        "</div>" +
      "</div>";
  }

  // ---- 2. progress vs shortest path --------------------------------------
  function renderScatter(data, canvas) {
    if (!data.scatter || typeof Chart === "undefined") return;

    var datasets = [];
    data.scatter.series.forEach(function (s) {
      var c = COLOUR[s.model] || "#666";
      datasets.push({
        label: s.model,
        data: s.points.filter(function (p) { return !p.solved; }),
        backgroundColor: c + "99",
        borderColor: "transparent",
        pointRadius: 4,
        pointHoverRadius: 6
      });
      datasets.push({
        label: s.model + " - solved",
        data: s.points.filter(function (p) { return p.solved; }),
        // Chart.js draws "star" as a stroked asterisk, so the visible colour
        // comes from borderColor - a white border here renders invisibly.
        backgroundColor: c,
        borderColor: c,
        borderWidth: 3,
        pointStyle: "star",
        pointRadius: 10,
        pointHoverRadius: 13
      });
    });

    new Chart(canvas.getContext("2d"), {
      type: "scatter",
      data: { datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              usePointStyle: true, boxWidth: 8,
              // one entry per model; the solve series share the name
              filter: function (item) { return item.text.indexOf(" - solved") === -1; }
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                return ctx.dataset.label.replace(" - solved", "") +
                  " · " + ctx.parsed.x + " moves · progress " + ctx.parsed.y.toFixed(2);
              }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: data.scatter.xLabel }, grid: { color: "rgba(0,0,0,0.05)" } },
          y: { title: { display: true, text: data.scatter.yLabel }, min: 0, max: 1.08,
               grid: { color: "rgba(0,0,0,0.05)" } }
        }
      }
    });
  }

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
    var scatterEl = document.getElementById("r1-scatter-chart");
    var quarterEl = document.getElementById("r1-quarter-chart");
    if (!gridEl && !funnelEl && !scatterEl && !quarterEl && !invEl && !thinkEl) return;

    var onHome = /\/(index\.html)?$/.test(window.location.pathname);
    // Versioned like the scripts are: the numbers change more often than the
    // code that draws them, and a cached copy of the old ones is invisible.
    var path = (onHome ? "static/data/" : "../data/") + "v2_r1_results.json?v=r1h";

    fetch(path)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (gridEl) renderGrid(data, gridEl);
        if (funnelEl) renderFunnel(data, funnelEl);
        if (scatterEl) renderScatter(data, scatterEl);
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
