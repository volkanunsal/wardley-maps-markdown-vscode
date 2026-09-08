import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";
import MarkdownIt from "markdown-it";
import { computeDocumentDiagnostics } from "../../src/diagnostics/documentDiagnostics";
import { wardleyMapsPlugin } from "../../src/markdownItPlugin";
import { createRenderer } from "../../src/renderer";

const corpusPath = fileURLToPath(new URL("../../examples/fidelity-corpus.md", import.meta.url));
const corpus = readFileSync(corpusPath, "utf8");

test("the reference corpus produces exactly one diagnostic: the y-axis notice on example 10", () => {
  const diagnostics = computeDocumentDiagnostics(corpus);
  assert.deepEqual(
    diagnostics.map((d) => ({ line: d.line, severity: d.severity, message: d.message })),
    [
      {
        line: corpus.split("\n").indexOf("y-axis Profit|Low|High"),
        severity: "information",
        message:
          "cli-owm does not support 'y-axis'; this map renders with the default value-chain labels.",
      },
    ],
  );
});

test("every fence in the reference corpus mounts an SVG, never an error card", () => {
  const markdownIt = new MarkdownIt();
  wardleyMapsPlugin(markdownIt);
  const dom = new JSDOM(`<body>${markdownIt.render(corpus)}</body>`);
  const document = dom.window.document;

  const placeholders = Array.from(document.querySelectorAll(".wardley-map"));
  assert.equal(placeholders.length, 11);

  const renderer = createRenderer({ getDefaultTheme: () => "wardley" });
  renderer.renderAll(document);

  placeholders.forEach((placeholder, index) => {
    assert.equal(placeholder.querySelector(".wardley-error"), null, `fence ${index + 1} showed an error card`);
    assert.ok(placeholder.querySelector("svg"), `fence ${index + 1} did not mount an svg`);
  });
});
