import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "public", "index.html"), "utf8");
const tools = fs.readFileSync(path.join(root, "public", "scripts", "analog-tools.js"), "utf8");
const player = fs.readFileSync(path.join(root, "public", "scripts", "sstv", "audio-player.js"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "styles", "sstv-audio-player.css"), "utf8");

test("SSTV tools use the custom player for encoded and received audio", () => {
  assert.match(tools, /id=.{0,8}at-player.{0,20}hidden/);
  assert.match(tools, /id=.{0,8}at-received.{0,20}hidden/);
  assert.equal((tools.match(/data-audio-player/g) || []).length, 2);
  assert.ok(tools.includes("initializeAudioPlayers(root)"));
  assert.ok(tools.includes('$("at-player").hidden=false'));
  assert.ok(tools.includes('$("at-received").hidden=false'));
});

test("Drop loads responsive custom player styling", () => {
  assert.ok(html.includes("styles/sstv-audio-player.css"));
  assert.ok(css.includes(".sstv-audio-player__controls"));
  assert.ok(css.includes("prefers-reduced-motion"));
  assert.ok(css.includes("forced-colors"));
});

test("player initializer supports dynamically created elements without duplicate controls", () => {
  assert.ok(player.includes("export function initializeAudioPlayer"));
  assert.ok(player.includes("export function initializeAudioPlayers"));
  assert.ok(player.includes("new WeakSet"));
  assert.ok(player.includes("audio.play()"));
});
