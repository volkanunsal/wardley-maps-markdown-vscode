import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, render } from "cli-owm";

test("patched cli-owm renders block-form pipeline children", () => {
  const text = "title Tea Shop\npipeline Cup of Tea [0.2, 0.8]\n{\ncomponent Cheap Cup [0.3]\ncomponent Nice Cup [0.7]\n}\ncomponent Cup of Tea [0.5, 0.5]\n";
  const map = parse(text);
  assert.ok(map.pipelines.length > 0, "expected at least one parsed pipeline");
  const svg = render(map, {});
  for (const child of map.pipelines[0].components) {
    assert.ok(svg.includes(child.name), `expected pipeline child '${child.name}' in the rendered SVG`);
  }
});

test("patched cli-owm renders attitude boxes with a non-negative height", () => {
  const text = "title Tea Shop\ncomponent Foo [0.5, 0.5]\npioneers [0.1, 0.2, 0.9, 0.6]\n";
  const map = parse(text);
  assert.ok(map.attitudes.length > 0, "expected at least one parsed attitude");
  const svg = render(map, {});
  assert.doesNotMatch(svg, /height="-/, "attitude box rect must not have a negative height");
});
