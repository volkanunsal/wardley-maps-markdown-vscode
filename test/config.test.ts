import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfigHeader } from "../src/config";

test("no header returns the whole input as body", () => {
  const result = parseConfigHeader("title Tea Shop\ncomponent Cup [0.5, 0.5]\n");
  assert.deepEqual(result.config, {});
  assert.equal(result.body, "title Tea Shop\ncomponent Cup [0.5, 0.5]\n");
  assert.equal(result.headerLineCount, 0);
});

test("parses theme, width, and height", () => {
  const raw = "---\ntheme: dark\nwidth: 900\nheight: 600\n---\ntitle Tea Shop\n";
  const result = parseConfigHeader(raw);
  assert.deepEqual(result.config, { theme: "dark", width: 900, height: 600 });
  assert.equal(result.body, "title Tea Shop\n");
  assert.equal(result.headerLineCount, 5);
});

test("unknown key is an Information diagnostic, and the map still renders", () => {
  const raw = "---\ncolor: red\n---\ntitle Tea Shop\n";
  const result = parseConfigHeader(raw);
  assert.deepEqual(result.config, {});
  assert.equal(result.headerDiagnostics.length, 1);
  assert.equal(result.headerDiagnostics[0].severity, "information");
  assert.match(result.headerDiagnostics[0].message, /Unknown/);
});

test("invalid theme value is an Error diagnostic", () => {
  const raw = "---\ntheme: neon\n---\ntitle Tea Shop\n";
  const result = parseConfigHeader(raw);
  assert.equal(result.config.theme, undefined);
  assert.equal(result.headerDiagnostics[0].severity, "error");
});

test("non-numeric width is an Error diagnostic", () => {
  const raw = "---\nwidth: wide\n---\ntitle Tea Shop\n";
  const result = parseConfigHeader(raw);
  assert.equal(result.config.width, undefined);
  assert.equal(result.headerDiagnostics[0].severity, "error");
});

test("unclosed header (no closing ---) treats everything as body", () => {
  const raw = "---\ntheme: dark\ntitle Tea Shop\n";
  const result = parseConfigHeader(raw);
  assert.deepEqual(result.config, {});
  assert.equal(result.body, raw);
});
