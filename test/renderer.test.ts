import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { renderSource, createRenderer, resolveTheme, decodeBase64Utf8 } from "../src/renderer";
import { trackDocumentListeners } from "./listenerTracking";

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

test("createRenderer defaults to the plain theme when no getDefaultTheme is provided", () => {
  const dom = new JSDOM(`<div class="wardley-map" data-source="${encode(TEA_SHOP)}" data-config="${encode("{}")}"></div>`);
  const element = dom.window.document.querySelector(".wardley-map") as unknown as HTMLElement;
  const renderer = createRenderer({});
  renderer.renderOne(element);
  const svg = element.querySelector("svg");
  assert.ok(svg);
  assert.match(svg!.innerHTML, /fill="white" id="fillArea"/);
});

test("a non-fatal cli-owm parse error still mounts the map, not an error card", () => {
  // `y-axis` is the confirmed case: cli-owm records a non-fatal ParseError for
  // it while render() still returns the complete map. Parse-error signal is the
  // editor diagnostics' job; blanking the preview loses the whole map.
  const withYAxis =
    "title Tea Shop\ny-axis Profit|Low|High\ncomponent Cup of Tea [0.79, 0.61]\ncomponent Kettle [0.43, 0.35]\nCup of Tea->Kettle\n";
  const result = renderSource(withYAxis, {}, "wardley");
  assert.ok(result.errors.length > 0, "precondition: cli-owm reports a non-fatal parse error");
  assert.match(result.svg, /^<svg /, "precondition: render() still produced a full SVG");

  const dom = new JSDOM(
    `<div class="wardley-map" data-source="${encode(withYAxis)}" data-config="${encode("{}")}"></div>`,
  );
  const element = dom.window.document.querySelector(".wardley-map") as unknown as HTMLElement;
  const renderer = createRenderer({ getDefaultTheme: () => "wardley" });
  renderer.renderOne(element);

  assert.equal(element.querySelector(".wardley-error"), null);
  assert.ok(element.querySelector("svg"));
});

test("an unrecognized line still mounts the map for every construct cli-owm did understand", () => {
  const broken = "title Broken\ngibberish line here\ncomponent Kettle [0.43, 0.35]\n";
  const dom = new JSDOM(
    `<div class="wardley-map" data-source="${encode(broken)}" data-config="${encode("{}")}"></div>`,
  );
  const element = dom.window.document.querySelector(".wardley-map") as unknown as HTMLElement;
  const renderer = createRenderer({ getDefaultTheme: () => "wardley" });
  renderer.renderOne(element);
  assert.equal(element.querySelector(".wardley-error"), null);
  assert.ok(element.querySelector("svg"));
});

test("createRenderer.renderOne shows an error card when the render pipeline throws", () => {
  const dom = new JSDOM(`<div class="wardley-map" data-source="!!!not base64!!!" data-config=""></div>`);
  const element = dom.window.document.querySelector(".wardley-map") as unknown as HTMLElement;
  const renderer = createRenderer({ getDefaultTheme: () => "wardley" });
  renderer.renderOne(element);
  assert.ok(element.querySelector(".wardley-error"));
});

test("decodeBase64Utf8 round-trips non-ASCII text encoded the way the plugin encodes it", () => {
  const original = "Café — 東京 — naïve";
  const encoded = Buffer.from(original, "utf8").toString("base64");
  assert.equal(decodeBase64Utf8(encoded), original);
});

test("a non-ASCII component name survives into the rendered SVG", () => {
  const source = "title Tea Shop\ncomponent Café au lait [0.5, 0.5]\n";
  const dom = new JSDOM(
    `<div class="wardley-map" data-source="${encode(source)}" data-config="${encode("{}")}"></div>`,
  );
  const element = dom.window.document.querySelector(".wardley-map") as unknown as HTMLElement;
  const renderer = createRenderer({ getDefaultTheme: () => "wardley" });
  renderer.renderOne(element);
  assert.match(element.innerHTML, /Café au lait/);
  assert.doesNotMatch(element.innerHTML, /CafÃ©/);
});

test("re-rendering the same element does not accumulate document-level listeners", () => {
  const dom = new JSDOM(
    `<div class="wardley-map" data-source="${encode(TEA_SHOP)}" data-config="${encode("{}")}"></div>`,
  );
  const document = dom.window.document;
  const element = document.querySelector(".wardley-map") as unknown as HTMLElement;

  const liveDocumentListeners = trackDocumentListeners(document);

  const renderer = createRenderer({ getDefaultTheme: () => "wardley" });
  renderer.renderOne(element);
  assert.equal(liveDocumentListeners.count(), 2);

  for (let i = 0; i < 10; i++) {
    renderer.reRenderAll(document);
  }
  assert.equal(liveDocumentListeners.count(), 2);
});

test("createRenderer.renderAll skips elements already marked rendered", () => {
  const dom = new JSDOM(
    `<div class="wardley-map" data-source="${encode(TEA_SHOP)}" data-config="${encode("{}")}" data-rendered="true"></div>`,
  );
  const renderer = createRenderer({ getDefaultTheme: () => "wardley" });
  renderer.renderAll(dom.window.document);
  assert.equal(dom.window.document.querySelector(".wardley-map svg"), null);
});
