import assert from "node:assert/strict";
import fs from "node:fs";

const main = fs.readFileSync("public/styles/styles-main.css", "utf8");
const deferred = fs.readFileSync("public/styles/styles-deferred.css", "utf8");
const index = fs.readFileSync("public/index.html", "utf8");

assert.match(index, /styles-main\.css/, "main stylesheet must remain part of the page shell");

assert.match(main, /header \{\s*display: flex;\s*\}/, "mobile header needs a legacy-safe baseline");
assert.match(main, /@supports selector\(header:has\(\*\)\)/, ":has() header enhancement must be feature-gated");

assert.match(main, /--x-peers-width: 100vw;/, "peer list needs a legacy width baseline");
assert.match(main, /@supports \(width: min\(100vw, 100vw\)\)/, "peer list min() enhancement must be feature-gated");

assert.match(main, /\.optical-matrix-dialog \{ width: 640px; max-width: calc\(100vw - 24px\);/, "dialog needs a legacy width fallback");
assert.match(main, /\.erikraft-qr-camera-wrapper \{[\s\S]*height: 330px;[\s\S]*aspect-ratio: 4 \/ 3;/, "QR camera needs an aspect-ratio fallback");

assert.match(deferred, /@supports selector\(x-peers:has\(x-peer\)\)/, "deferred :has() peer rules must be feature-gated");
assert.match(deferred, /background-image: linear-gradient\(45deg, var\(--accent-color\), var\(--accent-color\)\);/, "color-mix needs a legacy-safe gradient");
assert.match(deferred, /background-image: linear-gradient\(180deg, var\(--highlight-color\), var\(--highlight-color\)\);/, "highlight color-mix needs a legacy-safe gradient");
assert.match(deferred, /@supports \(background-image: linear-gradient\(45deg, color-mix\(/, "deferred color-mix enhancement must be feature-gated");

console.log("Progressive enhancement CSS compatibility checks passed.");
