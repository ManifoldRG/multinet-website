/* ============================================================
   MultiNet - shared site chrome

   Renders the sidebar navigation, the mobile nav/overlay and the
   CTA banner into every page, and wires up their behaviour.

   Usage - in each page:
     <body data-mn-page="home">
       <div id="mn-nav"></div>
       <div id="main-page-content">
         <div id="mn-cta"></div>
         ... page content ...

   `data-mn-page` selects which nav entry is highlighted. Valid
   values are the `id` fields in NAV below.

   Paths are resolved relative to this script's own location, so
   the same file works from / and from /static/pages/.

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

  // ---- External links -----------------------------------------------------
  var GH_V1 = "https://github.com/ManifoldRG/MultiNet";
  var GH_V2 = "https://github.com/ManifoldRG/MultiNet-v2.0";
  var GENESIS = GH_V1 + "/tree/main/src/modules";
  var EVAL_HARNESS = GH_V1 + "/tree/main/src/eval_harness";

  // ---- Navigation ---------------------------------------------------------
  // Add a page here once and it appears on every page of the site.
  var NAV = [
    { id: "home", label: "Home", icon: "fas fa-home", href: url("index.html") },
    {
      label: "Benchmark Releases", icon: "fas fa-microscope",
      children: [
        { id: "v2r1", label: "v2.0 R1 - GridWorld", icon: "fas fa-project-diagram", href: url("static/pages/Multinetv2R1.html") },
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
        { label: "GridWorld maze generator", icon: "fas fa-th", href: GH_V2, external: true },
        { label: "R1 evaluation pipeline", icon: "fas fa-flask", href: GH_V2, external: true },
        { label: "GenESIS framework", icon: "fas fa-code", href: GENESIS, external: true },
        { label: "Data Curation Toolkit", icon: "fab fa-github", href: GH_V1, external: true },
        { label: "Model Adaptations", icon: "fas fa-microchip", href: GH_V1, external: true }
      ]
    },
    // Embedded player lives in the R1 page Play the Maze section.
    { id: "play", label: "Play the Maze", icon: "fas fa-gamepad", href: url("static/pages/Multinetv2R1.html#play-the-maze") },
    { id: "submit", label: "Submit Your Model", icon: "fas fa-paper-plane", href: EVAL_HARNESS, external: true },
    { id: "about", label: "About Multinet", icon: "fas fa-info-circle", href: url("static/pages/Multinet.html") },
    { id: "cite", label: "Citation", icon: "fas fa-quote-right", href: url("index.html#BibTeX") }
  ];

  // ---- CTA banner ---------------------------------------------------------
  // One place to change the sitewide call to action.
  var CTA = {
    html: 'Want to run your model on MultiNet v2.0? ' +
          '<a href="mailto:pranav@metarch.ai?subject=Running%20a%20model%20on%20MultiNet%20v2.0" ' +
          'style="color: #90EE90; text-decoration: underline;">' +
          '<i class="fas fa-envelope" style="margin-right: 0.3em;"></i>Get in touch with us</a>'
  };

  // ---- Markup -------------------------------------------------------------
  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstChild;
  }

  function attrs(item) {
    return item.external ? ' target="_blank" rel="noopener noreferrer"' : "";
  }

  function leafHtml(item, current, cls) {
    var active = item.id && item.id === current ? " active" : "";
    return '<a href="' + item.href + '" class="' + cls + active + '"' + attrs(item) + '>' +
      '<span class="icon"><i class="' + item.icon + '"></i></span>' +
      '<span class="nav-text" style="white-space: nowrap;">' + item.label + "</span></a>";
  }

  function groupHtml(item, current) {
    var kids = item.children.map(function (c) {
      return leafHtml(c, current, "dropdown-item main-release-link");
    }).join("");
    return '<div class="nav-item has-dropdown" style="padding: 0;">' +
      '<a href="#" class="dropdown-toggle" aria-haspopup="true" aria-expanded="false">' +
        '<span class="icon"><i class="' + item.icon + '"></i></span>' +
        '<span class="nav-text">' + item.label + "</span>" +
        '<span class="dropdown-arrow"><i class="fas fa-chevron-right"></i></span>' +
      "</a>" +
      '<div class="dropdown-menu-items level-1">' + kids + "</div>" +
    "</div>";
  }

  function buildNav(current) {
    var items = NAV.map(function (item) {
      return item.children ? groupHtml(item, current) : leafHtml(item, current, "nav-item");
    }).join("");

    return '<div class="mn-shell-root">' +
      '<button class="mobile-nav-toggle" id="mobileNavToggle" style="display: none;" aria-label="Toggle mobile navigation">' +
        '<i class="fas fa-bars"></i></button>' +
      '<div class="mobile-overlay" id="mobileOverlay"></div>' +
      '<div id="side-nav" class="side-navigation collapsed">' +
        '<div class="logo-container">' +
          '<a href="' + url("index.html") + '" class="site-title-logo">' +
            '<img src="' + url("static/images/multinet_no_text.png") + '" alt="MultiNet Logo" ' +
            'style="height: 40px; margin-right: 8px; vertical-align: middle; border-radius: 8px;">MultiNet</a>' +
          '<button class="nav-toggle-btn" id="navToggleBtn" aria-label="Toggle navigation"><i class="fas fa-bars"></i></button>' +
        "</div>" +
        '<div class="side-navigation-menu">' + items + "</div>" +
      "</div></div>";
  }

  function buildCta() {
    return '<div id="cta-banner" class="cta-banner" style="background: linear-gradient(135deg, #005A9C 0%, #003D6B 100%); color: white; padding: 10px 50px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: relative;">' +
      '<button id="cta-close-btn" style="position: absolute; top: 10px; right: 15px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.3); color: white; font-size: 18px; cursor: pointer; padding: 8px; line-height: 1; opacity: 0.9; transition: all 0.3s ease; z-index: 10; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px;" title="Close banner">×</button>' +
      '<p style="margin: 0; font-size: 1.1rem; font-weight: 500;">' + CTA.html + "</p>" +
    "</div>";
  }

  // ---- Behaviour ----------------------------------------------------------
  function isMobile() { return window.innerWidth <= 768; }

  function wire() {
    var sideNav = document.getElementById("side-nav");
    var navToggleBtn = document.getElementById("navToggleBtn");
    var mobileNavToggle = document.getElementById("mobileNavToggle");
    var mobileOverlay = document.getElementById("mobileOverlay");
    if (!sideNav) return;

    function closeAllDropdowns() {
      sideNav.querySelectorAll(".nav-item.has-dropdown.open").forEach(function (d) {
        d.classList.remove("open");
        var t = d.querySelector(".dropdown-toggle");
        if (t) t.setAttribute("aria-expanded", "false");
        var menu = d.querySelector(":scope > .dropdown-menu-items");
        if (menu) menu.style.maxHeight = null;
        var arrow = d.querySelector(".dropdown-arrow .fas");
        if (arrow) arrow.classList.remove("rotated");
      });
    }

    function expandSidebar() {
      if (!sideNav.classList.contains("collapsed")) return;
      sideNav.classList.remove("collapsed");
      if (isMobile()) {
        mobileOverlay.classList.add("active");
        document.body.classList.add("mobile-nav-open");
      }
      closeAllDropdowns();
    }

    function collapseSidebar() {
      if (sideNav.classList.contains("collapsed")) return;
      sideNav.classList.add("collapsed");
      if (isMobile()) {
        mobileOverlay.classList.remove("active");
        document.body.classList.remove("mobile-nav-open");
      }
      closeAllDropdowns();
    }

    function toggleSidebar() {
      if (sideNav.classList.contains("collapsed")) expandSidebar();
      else collapseSidebar();
    }

    function toggleDropdown(navItem) {
      var menu = navItem.querySelector(":scope > .dropdown-menu-items");
      var toggle = navItem.querySelector(":scope > .dropdown-toggle");
      if (!menu) return;
      var open = navItem.classList.toggle("open");
      if (toggle) toggle.setAttribute("aria-expanded", String(open));
      menu.style.maxHeight = open ? menu.scrollHeight + "px" : null;
      var arrow = navItem.querySelector(".dropdown-arrow .fas");
      if (arrow) arrow.classList.toggle("rotated", open);

      if (open) {
        Array.prototype.forEach.call(navItem.parentElement.children, function (sib) {
          if (sib === navItem || !sib.classList.contains("has-dropdown")) return;
          sib.classList.remove("open");
          var st = sib.querySelector(".dropdown-toggle");
          if (st) st.setAttribute("aria-expanded", "false");
          var sm = sib.querySelector(":scope > .dropdown-menu-items");
          if (sm) sm.style.maxHeight = null;
          var sa = sib.querySelector(".dropdown-arrow .fas");
          if (sa) sa.classList.remove("rotated");
        });
      }
    }

    if (navToggleBtn) {
      navToggleBtn.addEventListener("click", toggleSidebar);
      navToggleBtn.addEventListener("mouseenter", function () {
        if (!isMobile()) expandSidebar();
      });
    }
    if (mobileNavToggle) mobileNavToggle.addEventListener("click", toggleSidebar);
    if (mobileOverlay) mobileOverlay.addEventListener("click", collapseSidebar);

    document.addEventListener("click", function (e) {
      if (sideNav.classList.contains("collapsed")) return;
      if (sideNav.contains(e.target)) return;
      if (navToggleBtn && navToggleBtn.contains(e.target)) return;
      if (mobileNavToggle && mobileNavToggle.contains(e.target)) return;
      collapseSidebar();
    });

    // Desktop: hovering a group opens its flyout. Mobile: tap to open.
    sideNav.querySelectorAll(".nav-item.has-dropdown").forEach(function (navItem) {
      navItem.addEventListener("mouseover", function () {
        if (isMobile()) return;
        navItem.classList.add("open");
        var t = navItem.querySelector(".dropdown-toggle");
        if (t) t.setAttribute("aria-expanded", "true");
      });
      navItem.addEventListener("mouseout", function () {
        if (isMobile()) return;
        navItem.classList.remove("open");
        var t = navItem.querySelector(".dropdown-toggle");
        if (t) t.setAttribute("aria-expanded", "false");
      });

      var toggle = navItem.querySelector(":scope > .dropdown-toggle");
      if (!toggle) return;
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (sideNav.classList.contains("collapsed")) {
          expandSidebar();
          setTimeout(function () { toggleDropdown(navItem); }, isMobile() ? 150 : 50);
          return;
        }
        toggleDropdown(navItem);
      });
    });

    window.addEventListener("resize", function () {
      if (isMobile()) collapseSidebar();
      else if (mobileOverlay) mobileOverlay.classList.remove("active");
    });

    if (isMobile()) collapseSidebar();
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
    close.addEventListener("mouseenter", function () { this.style.opacity = "1"; });
    close.addEventListener("mouseleave", function () { this.style.opacity = "0.8"; });
  }

  // ---- Mount --------------------------------------------------------------
  function mount() {
    var current = document.body.getAttribute("data-mn-page") || "";

    var navSlot = document.getElementById("mn-nav");
    if (navSlot) navSlot.replaceWith(el(buildNav(current)));

    var ctaSlot = document.getElementById("mn-cta");
    if (ctaSlot) ctaSlot.replaceWith(el(buildCta()));

    wire();
    wireCta();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
