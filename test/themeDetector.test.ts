import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { detectVsCodeTheme } from "../src/themeDetector";

function documentWithBodyClass(className: string): Document {
  const dom = new JSDOM(`<body class="${className}"></body>`);
  return dom.window.document;
}

test("vscode-dark maps to dark", () => {
  assert.equal(detectVsCodeTheme(documentWithBodyClass("vscode-dark")), "dark");
});

test("vscode-light maps to plain", () => {
  assert.equal(detectVsCodeTheme(documentWithBodyClass("vscode-light")), "plain");
});

test("vscode-high-contrast maps to plain", () => {
  assert.equal(detectVsCodeTheme(documentWithBodyClass("vscode-high-contrast")), "plain");
});

test("no recognized class falls back to plain", () => {
  assert.equal(detectVsCodeTheme(documentWithBodyClass("some-other-class")), "plain");
});
