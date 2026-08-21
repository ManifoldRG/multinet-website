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
  // Notion form; responses land in the Figipedia database of the same name.
  // Declared here rather than beside the banner because the nav tree below is
  // built at load time and would otherwise read it as undefined.
  var SIGNUP = "https://sparkly-broccoli-3c7.notion.site/3bf4b1d3c487800596bbe4a150962cc0";
  var REPORT = "https://www.fig.inc/agentic-behavior-in-2d-mazes-previewing-a-multi-domain-benchmark/";

  // ---- The whole site, in one tree ----------------------------------------
  // This is the drawer. Everything the site has is reachable from here.
  var NAV = [
    { id: "home", label: "Home", icon: "fas fa-home", href: home() },
    {
      label: "Benchmark Releases", icon: "fas fa-microscope",
      children: [
        { id: "v2r1", label: "v2.0 - Gridworld", icon: "fas fa-project-diagram", href: home() },
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
    { id: "report", label: "Technical Report", icon: "fas fa-book-open", href: REPORT },
    { id: "play", label: "Play the Maze", icon: "fas fa-gamepad", href: home("#play-the-maze") },
    { id: "archive", label: "MultiNet v1.0", icon: "fas fa-archive", href: url("static/pages/archive.html") },
    // Same destination as the banner's call to action - one form, one place
    // for anyone who wants their model run.
    { id: "submit", label: "Evaluate Your Model", icon: "fas fa-paper-plane",
      href: SIGNUP, external: true },
    { id: "cite", label: "Citation", icon: "fas fa-quote-right", href: home("#citation") }
  ];

  // ---- CTA banner ---------------------------------------------------------
  // One place to change the sitewide call to action.
  var CTA = {
    // One line, one ask. The research index and the mailto used to sit on a
    // second row, but both were routes to the same place as the form - three
    // ways to do one thing is how a banner ends up ignored.
    html: 'How does your agent do on cross-domain, multimodal, long-horizon tasks? ' +
          '<a class="cta-banner__signup" href="' + SIGNUP + '" ' +
          'target="_blank" rel="noopener noreferrer">Work with us to find out!</a>'
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
  // Brand, menu button, and the three destinations most people actually want.
  // The whole site lives in the drawer; these are here because a link nobody
  // can see is a link nobody clicks - and the playable maze in particular was
  // the thing visitors lost when the old vertical rail went away.
  //
  // A horizontal bar costs no page width, which is why the shortcuts can come
  // back at all: the rail cost 70px of permanent inset on every page and the
  // homepage cannot spare it (the maze board is a fixed 1100px).
  //
  // Rendered as a segmented control rather than three buttons: three filled
  // keys in the corner shouted louder than the page they sit above. One quiet
  // track with a pill that slides to whatever you are pointing at says the
  // same thing without competing with the content.
  var SHORTCUTS = [
    { id: "play", label: "Play the maze", href: home("#play-the-maze"), icon: "fas fa-gamepad" },
    { id: "report", label: "Technical report", href: REPORT, icon: "fas fa-book-open", short: "Report" },
    { id: "archive", label: "MultiNet v1.0", href: url("static/pages/archive.html"),
      icon: "fas fa-archive", short: "v1.0" }
  ];

  function shortcutsHtml(current) {
    // The pill rests on the entry matching the page you are on, so the bar
    // shows where you are as well as where you can go.
    var items = SHORTCUTS.map(function (s) {
      var here = s.id === current ? " is-current" : "";
      return '<a class="mn-hdr__seg' + here + '" href="' + selfAware(s.href) + '">' +
        (s.icon ? '<i class="' + s.icon + '" aria-hidden="true"></i>' : "") +
        // The short label only exists so the track can shed width before it
        // has to drop the entry entirely.
        '<span class="mn-hdr__full">' + esc(s.label) + "</span>" +
        (s.short ? '<span class="mn-hdr__abbr">' + esc(s.short) + "</span>" : "") +
      "</a>";
    }).join("");
    return '<span class="mn-hdr__pill" aria-hidden="true"></span>' + items;
  }

  // Move the pill under a given entry. Measured rather than computed from
  // padding, so it stays correct when labels abbreviate at narrow widths.
  function wireSegments(nav) {
    if (!nav) return;
    var pill = nav.querySelector(".mn-hdr__pill");
    var segs = nav.querySelectorAll(".mn-hdr__seg");
    if (!pill || !segs.length) return;

    // `instant` places the pill without animating. It matters on the very
    // first placement: the element has just been inserted and has never been
    // laid out, so a transition started in that same tick begins from an
    // unresolved base and stalls - the pill stays at translateX(0) with a
    // CSSTransition stuck in `running` forever. Suppressing the transition
    // and forcing a reflow gives it a resolved starting point.
    function moveTo(el, instant) {
      if (!el) { nav.classList.remove("has-pill"); return; }
      if (instant) pill.style.transition = "none";
      pill.style.transform = "translateX(" + el.offsetLeft + "px)";
      pill.style.width = el.offsetWidth + "px";
      nav.classList.add("has-pill");
      if (instant) {
        void pill.offsetWidth;          // reflow, so the next change animates
        pill.style.transition = "";
      }
    }
    function resting() { return nav.querySelector(".mn-hdr__seg.is-current"); }

    segs.forEach(function (el) {
      el.addEventListener("mouseenter", function () { moveTo(el); });
      el.addEventListener("focus", function () { moveTo(el); });
    });
    nav.addEventListener("mouseleave", function () { moveTo(resting()); });
    nav.addEventListener("focusout", function () {
      if (!nav.contains(document.activeElement)) moveTo(resting());
    });

    // The pill is positioned from measured geometry, so it has to be
    // re-measured whenever that geometry moves. It moves more than you would
    // expect: the web font swaps in after first paint and changes every label
    // width, and `fonts.ready` resolves before the new metrics are applied.
    // Watching the track for size changes covers all of it, including the
    // label abbreviating at narrow widths.
    var settle = function () { moveTo(resting(), true); };
    settle();
    if (window.ResizeObserver) {
      new ResizeObserver(settle).observe(nav);
    } else {
      // Fallback for browsers without ResizeObserver.
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
      window.addEventListener("load", settle);
      window.addEventListener("resize", settle);
    }
  }

  function buildHeader(current) {
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
        '<nav class="mn-hdr__nav">' + shortcutsHtml(current) + "</nav>" +
      "</div>" +
    "</header>";
  }

  function buildCta() {
    return '<div id="cta-banner" class="cta-banner">' +
      '<button id="cta-close-btn" title="Close banner" aria-label="Close banner">&times;</button>' +
      "<p>" + CTA.html + "</p>" +
    "</div>";
  }

  // ---- Superseded-version notice ------------------------------------------
  // The archive pages still rank and still get linked from old posts, so a
  // reader can land on v0.1 results with no way of knowing three releases
  // have happened since. Every page that is not the current release carries
  // this, including archive.html - despite its title, its content is the old
  // MultiNet landing page rather than an index.
  var SUPERSEDED = ["v01", "v02", "v1", "about", "archive"];

  function buildStale(current) {
    if (SUPERSEDED.indexOf(current) === -1) return "";
    // Not dismissible: unlike the CTA, this is context for reading the page
    // rather than an ask, and it stays relevant for the whole visit.
    return '<div class="mn-stale">' +
      '<span class="mn-stale__icon" aria-hidden="true"><i class="fas fa-history"></i></span>' +
      "<p>You are currently reading an older version of the MultiNet benchmark. " +
      'See our latest research <a href="' + home() + '">here</a>.</p>' +
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
      var hdr = el(buildHeader(current));
      navSlot.replaceWith(hdr);
      wireSegments(hdr.querySelector(".mn-hdr__nav"));

      // The bar carries no edge while it is at the top of the page, so it
      // meets whatever is beneath it cleanly. It grows one once it is
      // genuinely floating over content.
      var onScroll = function () {
        hdr.classList.toggle("is-stuck", window.scrollY > 2);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      // The drawer is a sibling of everything, appended last, so no page's
      // stacking context can trap it underneath.
      document.body.appendChild(el(buildDrawer(current)));
    }

    var ctaSlot = document.getElementById("mn-cta");
    if (ctaSlot) {
      // On a superseded page the notice takes the slot: stacking it above the
      // green CTA gives two full-width banners before any content, and "this
      // is out of date" is the more useful of the two to a reader who has
      // just landed here from a two-year-old link.
      var stale = buildStale(current);
      ctaSlot.replaceWith(el(stale || buildCta()));
    }

    wireDrawer();
    wireCta();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
