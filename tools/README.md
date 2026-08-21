# tools

## Mobile work without touching desktop

All mobile-only CSS lives in `static/css/mn-mobile.css`, linked from
`index.html` as:

```html
<link rel="stylesheet" href="static/css/mn-mobile.css?v=m2"
      media="screen and (max-width: 1023px)">
```

The `media` attribute means the browser never applies a single rule from that
file above 1023px, so desktop cannot regress from anything written there. 1023px
is not a new breakpoint - it is Bulma's `touch` boundary, and Bulma is already
loaded.

Two rules matter:

1. **Only add rules to `mn-mobile.css`.** Never edit a shared declaration in
   another stylesheet to fix a mobile problem. That is how the play splash got
   shrunk from 1100px to 643px on desktop.
2. **The link must stay after the inline `style` block** at the end of `head`.
   Same-specificity rules are settled by document order, and the 600-line inline
   block in `index.html` otherwise wins the ties.

## Verifying desktop is unchanged

`desktop-geometry-probe.js` fingerprints the page: position, size, font size,
padding, white-space and overflow for every laid-out element. Run it at a
desktop width before a change and after, then diff.

In a browser console on the page:

```js
const src = await (await fetch('/tools/desktop-geometry-probe.js')).text();
localStorage.setItem('mn_geom_baseline', JSON.stringify(eval(src)));   // before
// ... make the change, reload ...
const after = eval(src);                                               // after
```

Or save both to files and:

```
node tools/compare-geometry.js before.json after.json
```

It exits non-zero if anything moved. Compare at the same viewport size - the
probe records it so a mismatched comparison is obvious.

## Previewing real phone widths

Chrome will not size a window below ~600px, so `mobile-preview.html` renders
the live page in 390px and 768px iframes. Same origin, so the console can reach
inside and measure:

```
http://127.0.0.1:8899/tools/mobile-preview.html
```
