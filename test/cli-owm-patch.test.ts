import { test } from "node:test";
import assert from "node:assert/strict";
import { parse, render } from "cli-owm";

test("patched cli-owm renders block-form pipeline children inside the pipeline's own bar", () => {
  const text = "title Tea Shop\npipeline Cup of Tea [0.2, 0.8]\n{\ncomponent Cheap Cup [0.3]\ncomponent Nice Cup [0.7]\n}\ncomponent Cup of Tea [0.5, 0.5]\n";
  const map = parse(text);
  assert.ok(map.pipelines.length > 0, "expected at least one parsed pipeline");
  const svg = render(map, {});

  // renderPipeline emits a <g transform="translate(x1,y)"> whose first four children
  // are the four <line> elements that draw the pipeline's bounding box (0,0)-(w,0)-(w,h)-(0,h)-(0,0).
  // Matching that exact box shape (with backreferences tying the width/height together) picks out
  // the pipeline's own <g>, as distinct from any other <g> in the SVG (e.g. the value-chain axis
  // or evolution axis, which have different line counts/shapes). Everything captured after those
  // four lines and before the closing </g> is the pipeline's rendered children.
  const pipelineBlockPattern = new RegExp(
    '<g transform="translate\\(([-\\d.]+),([-\\d.]+)\\)">\\s*' +
      '<line x1="0" y1="0" x2="([\\d.]+)" y2="0"[^>]*/>\\s*' +
      '<line x1="\\3" y1="0" x2="\\3" y2="([\\d.]+)"[^>]*/>\\s*' +
      '<line x1="\\3" y1="\\4" x2="0" y2="\\4"[^>]*/>\\s*' +
      '<line x1="0" y1="\\4" x2="0" y2="0"[^>]*/>\\s*' +
      '([\\s\\S]*?)<\\/g>'
  );
  const match = svg.match(pipelineBlockPattern);
  assert.ok(match, "expected to find the pipeline's own <g> box (four boundary lines) in the rendered SVG");
  const pipelineWidth = Number(match[3]);
  const childrenMarkup = match[5];

  for (const child of map.pipelines[0].components) {
    const childPattern = new RegExp(
      `<rect x="(-?[\\d.]+)" y="[-\\d.]+" width="10" height="10"[^/]*/>` +
        `<text x="[-\\d.]+" y="[-\\d.]+"[^>]*>${child.name}</text>`
    );
    const childMatch = childrenMarkup.match(childPattern);
    assert.ok(
      childMatch,
      `expected pipeline child '${child.name}' to render as a rect+label inside the pipeline's own <g> block`
    );
    // rect x is emitted as localX - 5, so recover localX and confirm it falls within the bar's width.
    const localX = Number(childMatch[1]) + 5;
    assert.ok(
      localX >= 0 && localX <= pipelineWidth,
      `expected pipeline child '${child.name}' local x (${localX}) to fall within the pipeline bar width [0, ${pipelineWidth}]`
    );
  }
});

test("patched cli-owm renders attitude boxes with a non-negative height", () => {
  const text = "title Tea Shop\ncomponent Foo [0.5, 0.5]\npioneers [0.1, 0.2, 0.9, 0.6]\n";
  const map = parse(text);
  assert.ok(map.attitudes.length > 0, "expected at least one parsed attitude");
  const svg = render(map, {});
  assert.doesNotMatch(svg, /height="-/, "attitude box rect must not have a negative height");
});
