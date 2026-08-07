/* ============================================================
   MultiNet - shared site chrome

   Renders the top header and the CTA banner into every page.

   Usage - in each page:
     <body data-mn-page="home">
       <div id="mn-nav"></div>
       <div id="main-page-content">
         <div id="mn-cta"></div>
         ... page content ...

   `data-mn-page` selects which header link is marked current.
   Legacy release pages report their own id (v1, v02, v01, about);
   those all map to "Previous research".

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

  var GH_V2 = "https://github.com/ManifoldRG/MultiNet-v2.0";

  // ---- Header -------------------------------------------------------------
  // Deliberately flat and short. Anyone landing here has about two minutes;
  // a browsable tree of releases spends that budget on navigation.
  var NAV = [
    { id: "play",     label: "Play the maze",    href: url("index.html#play-the-maze") },
    // TODO(R1-TR): dummy destination until the report is on the Fig site.
    { id: "v2r1",     label: "Technical report", href: "#" },
    { id: "code",     label: "Code",             href: GH_V2, external: true },
    { id: "archive",  label: "Previous research", href: url("static/pages/archive.html") }
  ];

  // Pages that predate v2.0 all light up the same header link.
  var ARCHIVED = { v1: 1, "v0.2": 1, v02: 1, v01: 1, about: 1, archive: 1 };

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

  function buildHeader(current) {
    var isArchived = !!ARCHIVED[current];
    var links = NAV.map(function (n) {
      var active = (n.id === current || (n.id === "archive" && isArchived)) ? " is-current" : "";
      var attrs = n.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      return '<a class="mn-hdr__link' + active + '" href="' + n.href + '"' + attrs + '>' +
        n.label + "</a>";
    }).join("");

    return '<header class="mn-hdr">' +
      '<div class="mn-hdr__inner">' +
        '<a class="mn-hdr__brand" href="' + url("index.html") + '">' +
          '<img src="' + url("static/images/multinet_no_text.png") + '" alt="">' +
          "<span>MultiNet</span>" +
        "</a>" +
        '<button class="mn-hdr__toggle" id="mnHdrToggle" aria-label="Menu" aria-expanded="false">' +
          '<i class="fas fa-bars"></i></button>' +
        '<nav class="mn-hdr__links" id="mnHdrLinks">' +
          '<span class="mn-hdr__pill" id="mnHdrPill" aria-hidden="true"></span>' +
          links +
        "</nav>" +
      "</div>" +
    "</header>";
  }

  function buildCta() {
    return '<div id="cta-banner" class="cta-banner">' +
      '<button id="cta-close-btn" title="Close banner" aria-label="Close banner">&times;</button>' +
      "<p>" + CTA.html + "</p>" +
    "</div>";
  }

  // The glass bar carries one lit pill that slides between links rather than
  // each link lighting up on its own. Position and width are handed to CSS as
  // custom properties so the movement is a transition, not a repaint loop.
  function wirePill() {
    var nav = document.getElementById("mnHdrLinks");
    var pill = document.getElementById("mnHdrPill");
    if (!nav || !pill) return;

    var current = nav.querySelector(".mn-hdr__link.is-current");

    function moveTo(el) {
      if (!el) { pill.style.opacity = "0"; return; }
      pill.style.opacity = "1";
      pill.style.setProperty("--x", el.offsetLeft + "px");
      pill.style.setProperty("--w", el.offsetWidth + "px");
    }

    function settle() { moveTo(current); }

    nav.addEventListener("mouseover", function (e) {
      var a = e.target.closest(".mn-hdr__link");
      if (a) moveTo(a);
    });
    nav.addEventListener("mouseleave", settle);
    nav.addEventListener("focusin", function (e) {
      var a = e.target.closest(".mn-hdr__link");
      if (a) moveTo(a);
    });
    nav.addEventListener("focusout", settle);

    // Fonts land after first paint and change link widths, so measure again
    // once they have; and again whenever the bar is resized.
    settle();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
    window.addEventListener("resize", settle);
    // No transition on the very first placement - it would slide in from 0.
    requestAnimationFrame(function () { pill.classList.add("is-ready"); });
  }

  function wireHeader() {
    var toggle = document.getElementById("mnHdrToggle");
    var links = document.getElementById("mnHdrLinks");
    if (!toggle || !links) return;

    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    // Tapping a link closes the mobile menu.
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        links.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      }
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
    var current = document.body.getAttribute("data-mn-page") || "";

    var navSlot = document.getElementById("mn-nav");
    if (navSlot) navSlot.replaceWith(el(buildHeader(current)));

    var ctaSlot = document.getElementById("mn-cta");
    if (ctaSlot) ctaSlot.replaceWith(el(buildCta()));

    wireHeader();
    wirePill();
    wireCta();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
