/* ============================================================
   MultiNet v2.0 R1 - failure replay reel

   Two recorded episodes per model, all of them failures. A row of
   model pills picks the model; a lighter row underneath picks
   which of that model's clips to play, tinted in that model's
   brand colour.

   Both the landing page and the full analysis page show this, so
   the clip list lives here rather than in either page - adding a
   model or a third clip is a one-line change in one file.

   Markup expected:
     <div id="r1-reel-models"></div>   <- model pills
     <div id="r1-reel-clips"></div>    <- Example 1 / Example 2
     <video id="r1-reel-video"></video>

   Styles: static/css/r1-components.css
   ============================================================ */
(function () {
  "use strict";

  // ---- Resolve the site root from this script's own src -------------------
  // so the same file works from / and from /static/pages/.
  var thisScript = document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();
  var ROOT = thisScript.src.replace(/static\/js\/v2_r1_reel\.js.*$/, "");

  // Brand marks live in static/images/logos/ (see the README there).
  var MODELS = [
    {
      name: "Claude Opus 4.8",
      brand: "#D97757",          // Anthropic clay
      logo: "static/images/logos/claude.svg",
      clips: [
        "r1_B1_8x8_corridor_swg_0__claude_FAIL.mp4",
        "r1_M3_8x8_corridor_kr_sg_1__claude_FAIL.mp4"
      ]
    },
    {
      name: "Kimi k2.6",
      brand: "#1F1F1F",          // Kimi black
      logo: "static/images/logos/kimi.svg",
      clips: [
        "r1_M3_8x8_corridor_kr_sg_1__kimi_FAIL.mp4",
        "r1_D2_10x10_corridor_wrong_ky_kr_inactive_sb_sg_kb_0__kimi_FAIL.mp4"
      ]
    },
    {
      name: "Qwen3.6-27B",
      brand: "#6950EF",          // Qwen purple
      logo: "static/images/logos/qwen.svg",
      clips: [
        "r1_M1_10x10_corridor_kr_1__qwen_FAIL.mp4",
        "r1_M5_10x10_dense_kr_kb_1__qwen_FAIL.mp4"
      ]
    }
  ];

  function init() {
    var modelBar = document.getElementById("r1-reel-models");
    var clipBar = document.getElementById("r1-reel-clips");
    var video = document.getElementById("r1-reel-video");
    if (!modelBar || !clipBar || !video) return;

    function play(mi, ci) {
      var m = MODELS[mi];

      video.src = ROOT + "static/videos/r1_reels/" + m.clips[ci];

      // The landing page autoplays its reel; the analysis page gives it
      // controls instead. Switching clips faster than one can load aborts the
      // pending play(), which leaves the reel sitting on a still frame - so
      // retry once the new clip is actually playable, and never let a blocked
      // autoplay throw.
      if (video.autoplay) {
        var start = function () { video.play().catch(function () {}); };
        video.addEventListener("canplay", start, { once: true });
        start();
      }

      Array.prototype.forEach.call(modelBar.children, function (b, j) {
        b.classList.toggle("active", j === mi);
      });

      // rebuild the clip row for the selected model, in that model's colour
      clipBar.innerHTML = "";
      clipBar.style.setProperty("--brand", m.brand);
      m.clips.forEach(function (c, j) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "r1-reel-clip" + (j === ci ? " active" : "");
        b.textContent = "Example " + (j + 1);
        b.addEventListener("click", function () { play(mi, j); });
        clipBar.appendChild(b);
      });
    }

    MODELS.forEach(function (m, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "r1-reel-model";
      b.style.setProperty("--brand", m.brand);
      b.style.setProperty("--logo", 'url("' + ROOT + m.logo + '")');
      b.innerHTML = '<span class="r1-logo" aria-hidden="true"></span><span></span>';
      b.lastChild.textContent = m.name;
      b.addEventListener("click", function () { play(i, 0); });
      modelBar.appendChild(b);
    });

    play(0, 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
