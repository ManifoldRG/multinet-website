/* ============================================================
   MultiNet v2 — shared shell (Phase 1)
   Injects the top nav + footer into every page that includes
   <div id="mn-nav"></div> and <div id="mn-footer"></div>, and
   renders the Research-hub tab bar into <div id="mn-tabs"></div>.

   Define once, appears everywhere — no build step (static site).
   Uses root-absolute paths so it works from / and /static/pages/.

   Per-page state via <body> data attributes:
     data-mn-page="home|benchmark|research|leaderboard"   -> highlights nav
     data-mn-tab="overview|v2|v1|v0.2|v0.1"               -> highlights tab
   ============================================================ */
(function () {
  "use strict";

  var GH_V2  = "https://github.com/ManifoldRG/MultiNet-v2.0"; // current benchmark (v2.0 / R1)
  var GH_OLD = "https://github.com/ManifoldRG/MultiNet";      // previous releases (v1.0 / v0.2 / v0.1)
  var DISCORD = "https://discord.gg/Rk4gAq5aYr";

  // --- Top nav links (hrefs provisional until all pages exist) ---
  var NAV = [
    { id: "benchmark",   label: "Benchmark",   href: "/static/pages/Multinetv2.html" },
    { id: "leaderboard", label: "Leaderboard", href: "/static/pages/Multinetv1.html#leaderboard-container" },
    { id: "research",    label: "Research",    href: "/static/pages/Multinet.html" },
    { id: "github",      label: "GitHub",      href: GH_V2, external: true }
  ];

  // --- Research-hub tabs ---
  var TABS = [
    { id: "overview", label: "Overview",                 href: "/static/pages/Multinet.html" },
    { id: "v2",       label: "v2.0 Cross-domain Action", href: "/static/pages/Multinetv2.html" },
    { id: "v1",       label: "v1.0 Generalist",          href: "/static/pages/Multinetv1.html" },
    { id: "v0.2",     label: "v0.2 Gameplay",            href: "/static/pages/Multinetv02.html" },
    { id: "v0.1",     label: "v0.1 Robotics",            href: "/static/pages/Multinetv01.html" }
  ];

  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }

  // Logo: a 5x5 grid maze; purple cells trace the optimal path (top-left -> bottom-right).
  function mazeLogo(sfx) {
    var gid = "mnMazeGrad-" + (sfx || "a");
    var n = 5, cell = 4, step = 5.5, m = 1;
    var path = { "0,0":1, "0,1":1, "1,1":1, "2,1":1, "2,2":1, "2,3":1, "3,3":1, "4,3":1, "4,4":1 };
    var rects = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var x = (m + c * step).toFixed(2), y = (m + r * step).toFixed(2);
      var fill = path[c + "," + r] ? "url(#" + gid + ")" : "rgba(255,255,255,.09)";
      rects += '<rect x="' + x + '" y="' + y + '" width="' + cell + '" height="' + cell + '" rx="1" fill="' + fill + '"/>';
    }
    return '<svg viewBox="0 0 28 28" width="26" height="26" aria-hidden="true">' +
      '<defs><linearGradient id="' + gid + '" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">' +
      '<stop stop-color="#C9B8FF"/><stop offset="1" stop-color="#8E6EF0"/></linearGradient></defs>' +
      rects + '</svg>';
  }

  function buildNav(current, repo) {
    var links = NAV.map(function (n) {
      var active = n.id === current ? " is-active" : "";
      var attrs = n.external ? ' target="_blank" rel="noopener"' : "";
      var href = n.id === "github" ? repo : n.href;
      return '<a class="mn-nav__link' + active + '" href="' + href + '"' + attrs + '>' + n.label + "</a>";
    }).join("");
    return el(
      '<nav class="mn-nav"><div class="mn-nav__inner">' +
        '<a class="mn-logo" href="/index.html">' + mazeLogo("nav") + "MultiNet</a>" +
        '<button class="mn-nav__toggle" aria-label="Menu">&#9776;</button>' +
        '<div class="mn-nav__links">' + links + "</div>" +
      "</div></nav>"
    );
  }

  function buildFooter(repo) {
    return el(
      '<footer class="mn-footer">' +
        '<div class="mn-footer__inner">' +
          '<div><div class="mn-footer__brand">' + mazeLogo("ft") + 'MultiNet</div>' +
            '<p style="margin-top:10px;max-width:34ch">An open benchmark for multimodal, long-horizon, cross-domain action - by <a href="https://metarch.ai/" target="_blank" rel="noopener">Fig</a> + <a href="https://www.manifoldrg.com/" target="_blank" rel="noopener">Manifold Research</a>.</p></div>' +
          '<div><h4>Benchmark</h4>' +
            '<a href="/static/pages/Multinetv2.html">v2.0 (R1)</a>' +
            '<a href="/static/pages/Multinet.html">Research hub</a>' +
            '<a href="/static/pages/Multinetv1.html#leaderboard">v1.0 Leaderboard</a></div>' +
          '<div><h4>Models &amp; Tools</h4>' +
            '<a href="https://github.com/eihli/mugato" target="_blank" rel="noopener">µGato</a>' +
            '<a href="https://github.com/ManifoldRG/NEKO" target="_blank" rel="noopener">NEKO</a>' +
            '<a href="https://github.com/ManifoldRG/MultiNet/tree/main/src/modules" target="_blank" rel="noopener">GenESIS</a></div>' +
          '<div><h4>Community</h4>' +
            '<a href="' + DISCORD + '" target="_blank" rel="noopener">Discord</a>' +
            '<a href="mailto:pranav@metarch.ai">Email</a>' +
            '<a href="' + repo + '" target="_blank" rel="noopener">GitHub</a></div>' +
        "</div>" +
        '<div class="mn-footer__bottom"><span>© 2026 MultiNet</span>' +
          '<a href="#BibTeX" style="display:inline">Cite</a></div>' +
      "</footer>"
    );
  }

  function buildTabs(current) {
    var tabs = TABS.map(function (t) {
      var active = t.id === current ? " is-active" : "";
      return '<a class="mn-tab' + active + '" href="' + t.href + '">' + t.label + "</a>";
    }).join("");
    return el('<div class="mn-tabs"><div class="mn-tabs__inner">' + tabs + "</div></div>");
  }

  function mount() {
    var body = document.body;
    var navSlot = document.getElementById("mn-nav");
    var footSlot = document.getElementById("mn-footer");
    var tabSlot = document.getElementById("mn-tabs");

    var mnTab = body.getAttribute("data-mn-tab");
    var repo = (mnTab === "v1" || mnTab === "v0.2" || mnTab === "v0.1") ? GH_OLD : GH_V2;
    if (navSlot) navSlot.replaceWith(buildNav(body.getAttribute("data-mn-page"), repo));
    if (tabSlot) tabSlot.replaceWith(buildTabs(mnTab));
    if (footSlot) footSlot.replaceWith(buildFooter(repo));

    // mobile nav toggle
    var toggle = document.querySelector(".mn-nav__toggle");
    var links = document.querySelector(".mn-nav__links");
    if (toggle && links) toggle.addEventListener("click", function () { links.classList.toggle("is-open"); });

    // count-up on headline numbers (.mn-countup with data-to / data-suffix)
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelectorAll(".mn-countup").forEach(function (el) {
      var to = parseFloat(el.getAttribute("data-to")) || 0, suffix = el.getAttribute("data-suffix") || "";
      var dec = parseInt(el.getAttribute("data-decimals") || "0", 10);
      if (reduce) { el.textContent = to.toFixed(dec) + suffix; return; }
      var run = function () {
        var start = null, dur = 1200;
        function step(ts) { if (!start) start = ts; var p = Math.min((ts - start) / dur, 1);
          el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(dec) + suffix;
          if (p < 1) requestAnimationFrame(step); }
        requestAnimationFrame(step);
      };
      if ("IntersectionObserver" in window) {
        var cio = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) { run(); cio.unobserve(e.target); } });
        });
        cio.observe(el);
      } else run();
    });

    // analytics: CTA / artifact / maze click events (PostHog + GA)
    function track(name, props) {
      try { if (window.posthog && posthog.capture) posthog.capture(name, props); } catch (e) {}
      try { if (window.gtag) gtag("event", name, props); } catch (e) {}
    }
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.mn-btn, .mn-artifacts a, a.mn-feature__block, .mn-nav__link, .mn-tab, .mn-logochip");
      if (!a) return;
      var label = (a.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60);
      var href = a.getAttribute("href") || "";
      var isMaze = /play the maze/i.test(label) || /maze/i.test(href);
      track(isMaze ? "play_maze_click" : "cta_click",
        { label: label, href: href, page: document.body.getAttribute("data-mn-page") || "" });
    });

    // scroll-reveal
    var reveals = document.querySelectorAll(".mn-reveal");
    if (reveals.length && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
      }, { threshold: 0.05, rootMargin: "0px 0px -60px 0px" });
      reveals.forEach(function (r) { io.observe(r); });
    } else {
      reveals.forEach(function (r) { r.classList.add("is-in"); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
