import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { renderSource, createRenderer, resolveTheme } from "../src/renderer";

const TEA_SHOP = "title Tea Shop\ncomponent Cup of Tea [0.79, 0.61]\ncomponent Kettle [0.43, 0.35]\nCup of Tea->Kettle\n";

test("renderSource returns an SVG string for a valid map", () => {
  const result = renderSource(TEA_SHOP, {}, "wardley");
  assert.equal(result.errors.length, 0);
  assert.match(result.svg, /^<svg /);
});

test("renderSource surfaces cli-owm parse errors without throwing", () => {
  const broken = "title Broken\ngibberish line here\n";
  const result = renderSource(broken, {}, "wardley");
  assert.ok(result.errors.length > 0);
  assert.equal(result.errors[0].name, "ParseError");
});

test("resolveTheme falls back to the default when the config theme is unknown", () => {
  const theme = resolveTheme("neon", "wardley");
  assert.equal(theme.className, "wardley");
});

test("resolveTheme uses the requested theme when it is valid", () => {
  const theme = resolveTheme("dark", "wardley");
  assert.equal(theme.className, "dark");
});

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64");
}

test("createRenderer.renderOne decodes the placeholder and mounts an SVG", () => {
  const dom = new JSDOM(`<div class="wardley-map" data-source="${encode(TEA_SHOP)}" data-config="${encode("{}")}"></div>`);
  const element = dom.window.document.querySelector(".wardley-map") as unknown as HTMLElement;
  const renderer = createRenderer({ getDefaultTheme: () => "wardley" });
  renderer.renderOne(element);
  assert.equal(element.getAttribute("data-rendered"), "true");
  assert.ok(element.querySelector("svg"));
  assert.ok(element.querySelector(".wardley-zoom-viewport"));
});

test("createRenderer.renderOne shows an error card when cli-owm reports a parse error", () => {
  const broken = encode("title Broken\ngibberish line here\n");
  const dom = new JSDOM(`<div class="wardley-map" data-source="${broken}" data-config="${encode("{}")}"></div>`);
  const element = dom.window.document.querySelector(".wardley-map") as unknown as HTMLElement;
  const renderer = createRenderer({ getDefaultTheme: () => "wardley" });
  renderer.renderOne(element);
  assert.ok(element.querySelector(".wardley-error"));
});

test("createRenderer.renderAll skips elements already marked rendered", () => {
  const dom = new JSDOM(
    `<div class="wardley-map" data-source="${encode(TEA_SHOP)}" data-config="${encode("{}")}" data-rendered="true"></div>`,
  );
  const renderer = createRenderer({ getDefaultTheme: () => "wardley" });
  renderer.renderAll(dom.window.document);
  assert.equal(dom.window.document.querySelector(".wardley-map svg"), null);
});
