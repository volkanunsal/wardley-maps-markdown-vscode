import { test } from "node:test";
import assert from "node:assert/strict";
import MarkdownIt from "markdown-it";
import { wardleyMapsPlugin } from "../src/markdownItPlugin";

function render(markdown: string): string {
  const md = new MarkdownIt();
  wardleyMapsPlugin(md);
  return md.render(markdown);
}

test("owm fence becomes a data-source/data-config placeholder", () => {
  const html = render("```owm\ntitle Tea Shop\n```\n");
  assert.match(html, /<div class="wardley-map" data-source="[^"]+" data-config="[^"]+"><\/div>/);
});

test("wardley fence info is accepted as an alias", () => {
  const html = render("```wardley\ntitle Tea Shop\n```\n");
  assert.match(html, /class="wardley-map"/);
});

test("a fence info with trailing whitespace is still recognized", () => {
  const html = render("```owm \ntitle Tea Shop\n```\n");
  assert.match(html, /<div class="wardley-map" data-source="[^"]+" data-config="[^"]+"><\/div>/);
  assert.doesNotMatch(html, /<pre><code/);
});

test("a wardley fence info with trailing whitespace is still recognized", () => {
  const html = render("```wardley \ntitle Tea Shop\n```\n");
  assert.match(html, /class="wardley-map"/);
});

test("other fence infos are untouched", () => {
  const html = render("```js\nconst x = 1;\n```\n");
  assert.match(html, /<pre><code class="language-js">/);
});

test("config header is base64-encoded separately from the body", () => {
  const html = render("```owm\n---\ntheme: dark\n---\ntitle Tea Shop\n```\n");
  const match = html.match(/data-source="([^"]+)" data-config="([^"]+)"/);
  assert.ok(match);
  const [, encodedSource, encodedConfig] = match!;
  assert.equal(Buffer.from(encodedSource, "base64").toString("utf8"), "title Tea Shop\n");
  assert.deepEqual(JSON.parse(Buffer.from(encodedConfig, "base64").toString("utf8")), { theme: "dark" });
});
