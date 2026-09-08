import { test } from "node:test";
import assert from "node:assert/strict";
import { computeDocumentDiagnostics } from "../../src/diagnostics/documentDiagnostics";

test("finds diagnostics inside an owm fence at the right absolute line", () => {
  const markdown = "# Heading\n\n```owm\ntitle Broken\ncomponent Foo [0.5, 1.4]\n```\n";
  const diagnostics = computeDocumentDiagnostics(markdown);
  assert.equal(diagnostics.length, 1);
  // Line 0: "# Heading", line 1: blank, line 2: fence open, line 3: "title Broken", line 4: the bad component.
  assert.equal(diagnostics[0].line, 4);
});

test("ignores fences with other info strings", () => {
  const markdown = "```js\nconst x = 1;\n```\n";
  assert.deepEqual(computeDocumentDiagnostics(markdown), []);
});

test("accepts the wardley fence info alias", () => {
  const markdown = "```wardley\ntitle Broken\ncomponent Foo [0.5, 1.4]\n```\n";
  const diagnostics = computeDocumentDiagnostics(markdown);
  assert.equal(diagnostics.length, 1);
});

test("offsets columns by the fence body's indentation", () => {
  const markdown = "- a list item\n\n  ```owm\n  title Broken\n  component Foo [0.5, 1.4]\n  ```\n";
  const diagnostics = computeDocumentDiagnostics(markdown);
  assert.equal(diagnostics.length, 1);
  assert.ok(diagnostics[0].startColumn >= 2);
});

test("a fence info with trailing whitespace is still scanned for diagnostics", () => {
  const markdown = "```owm \ntitle Broken\ncomponent Foo [0.5, 1.4]\n```\n";
  const diagnostics = computeDocumentDiagnostics(markdown);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 2);
});

test("a document with no fences has no diagnostics", () => {
  assert.deepEqual(computeDocumentDiagnostics("# Just a heading\n"), []);
});
