import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const tools = fs.readFileSync(path.join(root, "public", "scripts", "analog-tools.js"), "utf8");

test("communication tools launcher exists and remains keyboard reachable", () => {
  assert.match(html, /id="analog-tools-launch"[^>]*role="button"[^>]*tabindex="0"/);
});

test("communication tools use delegated click handling so a replaced header node still opens", () => {
  assert.match(tools, /document\.addEventListener\("click",event=>\{if\(!getCommunicationToolsLauncher\(event\.target\)\)/);
  assert.match(tools, /closest\?\.\("#analog-tools-launch"\)/);
});

test("communication tools dialog has a fallback when showModal is unavailable", () => {
  assert.match(tools, /typeof dialog\.showModal==="function"/);
  assert.match(tools, /dialog\.setAttribute\("open",""\)/);
  assert.match(tools, /dialog\.style\.position="fixed"/);
  assert.match(tools, /dialog\.style\.zIndex="2147483647"/);
  assert.match(tools, /removeAttribute\("open"\)/);
});

test("communication tools do not implement ECB or dynamically load remote CryptoJS", () => {
  assert.doesNotMatch(tools, /AES128ECB|C\.mode\.ECB|C\.AES/);
  assert.doesNotMatch(tools, /crypto-js@|cdn\.jsdelivr\.net\/npm\/crypto-js/);
  assert.match(tools, /AES256GCM/);
});
