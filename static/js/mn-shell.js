/* ============================================================
   MultiNet - shared site chrome

   Renders the same navigation on every page of the site:

     - a glass bar across the top, holding the brand, a menu
       button, and shortcuts to the few destinations most people
       want
     - a drawer holding the whole site tree, opened by the menu
       button and closed by anything reasonable

   The drawer overlays the page rather than pushing it. The rail
   this replaces cost 70px of permanent inset on every page, which
   the homepage cannot afford - the maze board is a fixed 1100px
   and the hero runs full width. Overlaying is what lets one
   navigation behave identically everywhere instead of one per
   layout.

   Usage - in each page:
     <body data-mn-page="v1">
       <div id="mn-nav"></div>
       <div id="main-page-content">
         <div id="mn-cta"></div>
         ... page content ...

   `data-mn-page` marks which entry is current.

   Paths resolve relative to this script's own location, so the
   same file works from / and from /static/pages/.

   Styles live in static/css/mn-shared.css.
   ============================================================ */
(function () {
  "use strict";

  // ---- Resolve the site root from this script's own src -------------------
  // mn-shell.js always lives at <root>/static/js/mn-shell.js
  var thisScript = document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();
  var ROOT = thisScript.src.replace(/static\/js\/mn-shell\.js.*$/, "");

  function url(p) { return ROOT + p; }

  // The homepage is linked as the directory, never as "index.html". They are
  // the same document but two URLs, so a browser keeps two cache entries and
  // does a full navigation between them - which is how one of them ends up
  // stale while the other looks fine.
  function home(hash) { return ROOT + (hash || ""); }

  // A link to this very page should not reload it. "/" and "/index.html" are
  // the same document but different URLs, so the browser treats them as
  // separate cache entries and does a full navigation between them - which
  // reloads the maze, refetches everything, and can serve a stale copy of one
  // while the other is current. Collapse any self-link to its hash so it just
  // scrolls.
  function selfAware(href) {
    var here = location.pathname.replace(/\/index\.html$/, "/");
    var a = document.createElement("a");
    a.href = href;
    var there = a.pathname.replace(/\/index\.html$/, "/");
    if (a.host !== location.host || there !== here) return href;
    return a.hash || "#";
  }

  var GH_V1 = "https://github.com/ManifoldRG/MultiNet";
  var GENESIS = GH_V1 + "/tree/main/src/modules";
  var SUBMIT_MAIL = "mailto:pranav@metarch.ai" +
    "?subject=Evaluating%20a%20model%20on%20MultiNet%20v2.0";
  // TODO(R1-TR): dummy destination until the report is on the Fig site.
  var REPORT = "#";

  // ---- The whole site, in one tree ----------------------------------------
  // This is the drawer. Everything the site has is reachable from here.
  var NAV = [
    { id: "home", label: "Home", icon: "fas fa-home", href: home() },
    {
      label: "Benchmark Releases", icon: "fas fa-microscope",
      children: [
        { id: "v2r1", label: "v2.0 Preview", icon: "fas fa-project-diagram", href: home() },
        { id: "v1", label: "v1.0 - Generalist", icon: "fas fa-rocket", href: url("static/pages/Multinetv1.html") },
        { id: "v02", label: "v0.2 - Gameplay", icon: "fas fa-gamepad", href: url("static/pages/Multinetv02.html") },
        { id: "v01", label: "v0.1 - Robotics", icon: "fas fa-robot", href: url("static/pages/Multinetv01.html") }
      ]
    },
    {
      label: "Model Releases", icon: "fas fa-rocket",
      children: [
        { label: "μGato", icon: "fas fa-microchip", href: "https://github.com/eihli/mugato", external: true },
        { label: "NEKO", icon: "fas fa-cat", href: "https://github.com/ManifoldRG/NEKO", external: true }
      ]
    },
    {
      label: "Software Releases", icon: "fas fa-code-branch",
      children: [
        { label: "GenESIS framework", icon: "fas fa-code", href: GENESIS, external: true },
        { label: "Data Curation Toolkit", icon: "fab fa-github", href: GH_V1, external: true },
        { label: "Model Adaptations", icon: "fas fa-microchip", href: GH_V1, external: true }
      ]
    },
    { id: "report", label: "Technical Report", icon: "fas fa-file-pdf", href: REPORT },
    { id: "play", label: "Play the Maze", icon: "fas fa-gamepad", href: home("#play-the-maze") },
    { id: "archive", label: "MultiNet Archive", icon: "fas fa-archive", href: url("static/pages/archive.html") },
    // No submission flow for v2.0 yet, so this opens a conversation rather
    // than pointing at the v1 harness, which would evaluate the wrong thing.
    { id: "submit", label: "Submit Your Model", icon: "fas fa-paper-plane", href: SUBMIT_MAIL },
    // TODO(R1-CITE): no citation block on the homepage yet - #BibTeX was an
    // anchor on the old site and went nowhere. Points at the report for now.
    { id: "cite", label: "Citation", icon: "fas fa-quote-right", href: REPORT }
  ];

  // ---- CTA banner ---------------------------------------------------------
  // One place to change the sitewide call to action.
  var CTA = {
    html: 'Want to evaluate your model on MultiNet v2.0? ' +
          '<a href="mailto:pranav@metarch.ai?subject=Evaluating%20a%20model%20on%20MultiNet%20v2.0" ' +
          'style="color: #90EE90; text-decoration: underline;">' +
          '<i class="fas fa-envelope" style="margin-right: 0.3em;"></i>Get in touch with us</a>'
  };

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function extAttrs(item) {
    return item.external ? ' target="_blank" rel="noopener noreferrer"' : "";
  }

  // ---- Drawer -------------------------------------------------------------
  function leafHtml(item, current, cls) {
    var active = item.id && item.id === current ? " is-current" : "";
    return '<a class="' + cls + active + '" href="' + selfAware(item.href) + '"' + extAttrs(item) + '>' +
      '<span class="mn-dw__icon"><i class="' + item.icon + '"></i></span>' +
      '<span class="mn-dw__label">' + esc(item.label) + "</span>" +
      (item.external ? '<span class="mn-dw__ext" aria-hidden="true">↗</span>' : "") +
    "</a>";
  }

  function groupHtml(item, current) {
    // A group opens if the page you are on lives inside it, so you never have
    // to go looking for where you already are.
    var holdsCurrent = item.children.some(function (c) { return c.id && c.id === current; });
    var open = holdsCurrent ? " is-open" : "";
    var kids = item.children.map(function (c) {
      return leafHtml(c, current, "mn-dw__link mn-dw__link--child");
    }).join("");

    return '<div class="mn-dw__group' + open + '">' +
      '<button type="button" class="mn-dw__link mn-dw__toggle" aria-expanded="' +
        (holdsCurrent ? "true" : "false") + '">' +
        '<span class="mn-dw__icon"><i class="' + item.icon + '"></i></span>' +
        '<span class="mn-dw__label">' + esc(item.label) + "</span>" +
        '<span class="mn-dw__caret" aria-hidden="true"><i class="fas fa-chevron-down"></i></span>' +
      "</button>" +
      // Children push their siblings down rather than floating over them,
      // which is what the old rail did - it clipped the entries beneath.
      '<div class="mn-dw__children">' + kids + "</div>" +
    "</div>";
  }

  function buildDrawer(current) {
    var items = NAV.map(function (item) {
      return item.children ? groupHtml(item, current) : leafHtml(item, current, "mn-dw__link");
    }).join("");

    return '<div class="mn-dw" id="mnDrawer" hidden>' +
      '<div class="mn-dw__scrim" id="mnScrim"></div>' +
      '<nav class="mn-dw__panel" id="mnDrawerPanel" aria-label="Site navigation">' +
        '<div class="mn-dw__head">' +
          '<a class="mn-dw__brand" href="' + selfAware(home()) + '">' +
            '<img src="' + url("static/images/multinet_no_text.png") + '" alt="">' +
            "<span>MultiNet</span>" +
          "</a>" +
          '<button type="button" class="mn-dw__close" id="mnDrawerClose" aria-label="Close menu">' +
            '<i class="fas fa-times"></i></button>' +
        "</div>" +
        '<div class="mn-dw__items">' + items + "</div>" +
      "</nav>" +
    "</div>";
  }

  // ---- Bar ----------------------------------------------------------------
  // Brand and menu button, nothing else. Every link it used to carry is in
  // the drawer, so the duplicates only cost width - and it is being narrow
  // that lets the bar stay pinned without sitting on top of the page.
  function buildHeader() {
    return '<header class="mn-hdr">' +
      '<div class="mn-hdr__inner">' +
        '<button type="button" class="mn-hdr__menu" id="mnMenuBtn" aria-label="Open menu" ' +
          'aria-expanded="false" aria-controls="mnDrawer">' +
          '<span class="mn-hdr__bars" aria-hidden="true"><i></i><i></i><i></i></span>' +
        "</button>" +
        '<a class="mn-hdr__brand" href="' + selfAware(home()) + '">' +
          '<img src="' + url("static/images/multinet_no_text.png") + '" alt="">' +
          "<span>MultiNet</span>" +
        "</a>" +
      "</div>" +
    "</header>";
  }

  function buildCta() {
    return '<div id="cta-banner" class="cta-banner">' +
      '<button id="cta-close-btn" title="Close banner" aria-label="Close banner">&times;</button>' +
      "<p>" + CTA.html + "</p>" +
    "</div>";
  }

  // ---- Behaviour ----------------------------------------------------------
  function wireDrawer() {
    var drawer = document.getElementById("mnDrawer");
    var panel = document.getElementById("mnDrawerPanel");
    var btn = document.getElementById("mnMenuBtn");
    if (!drawer || !panel || !btn) return;

    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      drawer.hidden = false;
      // The browser has to see the closed state before the open one or there is
      // nothing to transition between. Reading a layout property forces that
      // synchronously - requestAnimationFrame would do it too, but it does not
      // fire in a tab that is not being painted, which leaves the panel stuck
      // half open.
      void drawer.offsetWidth;
      drawer.classList.add("is-open");
      btn.setAttribute("aria-expanded", "true");
      document.body.classList.add("mn-noscroll");
      var first = panel.querySelector(".mn-dw__link, .mn-dw__close");
      if (first) first.focus();
    }

    function close() {
      drawer.classList.remove("is-open");
      btn.setAttribute("aria-expanded", "false");
      document.body.classList.remove("mn-noscroll");
      // wait out the slide before taking it out of the tree
      setTimeout(function () {
        if (!drawer.classList.contains("is-open")) drawer.hidden = true;
      }, 280);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    btn.addEventListener("click", function () {
      if (drawer.classList.contains("is-open")) close(); else open();
    });
    document.getElementById("mnScrim").addEventListener("click", close);
    document.getElementById("mnDrawerClose").addEventListener("click", close);

    // Following a link closes the drawer. On a same-page anchor nothing else
    // would, and the drawer would sit over the section it just jumped to.
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) { close(); return; }
      if (e.key !== "Tab" || !drawer.classList.contains("is-open")) return;
      // Keep tabbing inside the drawer while it is open.
      var f = panel.querySelectorAll("a[href], button:not([disabled])");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    // Groups expand in place. Height is measured rather than guessed, so the
    // transition works whatever the child count.
    panel.addEventListener("click", function (e) {
      var toggle = e.target.closest(".mn-dw__toggle");
      if (!toggle) return;
      var group = toggle.parentElement;
      var kids = group.querySelector(".mn-dw__children");
      var isOpen = group.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
      kids.style.maxHeight = isOpen ? kids.scrollHeight + "px" : "";
    });

    // Whatever is open at load needs its height set too.
    panel.querySelectorAll(".mn-dw__group.is-open .mn-dw__children").forEach(function (k) {
      k.style.maxHeight = k.scrollHeight + "px";
    });
  }

  function wireCta() {
    var banner = document.getElementById("cta-banner");
    var close = document.getElementById("cta-close-btn");
    if (!banner || !close) return;
    close.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      banner.style.display = "none";
    });
  }

  function mount() {
    // Which build is actually on screen. A stale HTML cache serves old asset
    // versions without touching the network, which looks like a broken page
    // rather than an old one - this makes the difference visible.
    var sheet = [].slice.call(document.styleSheets).map(function (s) { return s.href; })
      .filter(function (h) { return h && h.indexOf("mn-shared") > -1; })[0];
    if (window.console) {
      console.log("[MultiNet] shell " + (thisScript.src.split("?v=")[1] || "unversioned") +
                  " / styles " + (sheet ? sheet.split("?v=")[1] || "unversioned" : "missing"));
    }

    var current = document.body.getAttribute("data-mn-page") || "";

    var navSlot = document.getElementById("mn-nav");
    if (navSlot) {
      navSlot.replaceWith(el(buildHeader()));
      // The drawer is a sibling of everything, appended last, so no page's
      // stacking context can trap it underneath.
      document.body.appendChild(el(buildDrawer(current)));
    }

    var ctaSlot = document.getElementById("mn-cta");
    if (ctaSlot) ctaSlot.replaceWith(el(buildCta()));

    wireDrawer();
    wireCta();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
