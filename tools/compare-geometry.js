/* Diff two desktop-geometry-probe outputs. Exits non-zero on any change. */
const fs = require("fs");
const [a, b] = process.argv.slice(2).map(p => JSON.parse(fs.readFileSync(p, "utf8")));
const diffs = [];
if (a.viewport !== b.viewport) diffs.push(`viewport ${a.viewport} -> ${b.viewport} (not comparable)`);
for (const k of ["scrollWidth", "scrollHeight", "elementCount"])
  if (a[k] !== b[k]) diffs.push(`${k}: ${a[k]} -> ${b[k]}`);
const keys = new Set([...Object.keys(a.elements), ...Object.keys(b.elements)]);
for (const k of keys) {
  const x = a.elements[k], y = b.elements[k];
  if (x === y) continue;
  if (x === undefined) diffs.push(`ADDED   ${k}`);
  else if (y === undefined) diffs.push(`REMOVED ${k}`);
  else diffs.push(`CHANGED ${k}\n    before ${x}\n    after  ${y}`);
}
if (!diffs.length) {
  console.log(`desktop unchanged - ${a.elementCount} elements identical at ${a.viewport}`);
  process.exit(0);
}
console.log(`${diffs.length} desktop difference(s):\n`);
diffs.slice(0, 40).forEach(d => console.log("  " + d));
if (diffs.length > 40) console.log(`  ... and ${diffs.length - 40} more`);
process.exit(1);
