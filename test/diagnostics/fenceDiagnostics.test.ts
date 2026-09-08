import { test } from "node:test";
import assert from "node:assert/strict";
import { collectFenceDiagnostics } from "../../src/diagnostics/fenceDiagnostics";

function messages(fenceContent: string) {
  return collectFenceDiagnostics(fenceContent).map((d) => ({ message: d.message, severity: d.severity, line: d.line }));
}

test("a well-formed map has no diagnostics", () => {
  const result = collectFenceDiagnostics(
    "title Tea Shop\ncomponent Cup of Tea [0.79, 0.61]\ncomponent Kettle [0.43, 0.35]\nCup of Tea->Kettle\n",
  );
  assert.deepEqual(result, []);
});

test("a non-numeric coordinate is an Error", () => {
  const result = messages("title Broken\ncomponent Foo [zzz, 0.5]\n");
  assert.ok(result.some((d) => d.severity === "error" && /must be a number/.test(d.message)));
});

test("a coordinate outside [0, 1] is a Warning", () => {
  const result = messages("title Broken\ncomponent Foo [0.5, 1.4]\n");
  assert.ok(result.some((d) => d.severity === "warning" && /outside the valid range/.test(d.message)));
});

test("a link referencing an undeclared component is a Warning", () => {
  const result = messages("title Broken\ncomponent Foo [0.5, 0.5]\nFoo->Nowhere\n");
  assert.ok(result.some((d) => d.severity === "warning" && /undeclared component 'Nowhere'/.test(d.message)));
});

test("evolve naming an undeclared component is a Warning", () => {
  const result = messages("title Broken\nevolve Ghost 0.5\n");
  assert.ok(result.some((d) => d.severity === "warning" && /undeclared component 'Ghost'/.test(d.message)));
});

test("a duplicate component name is a Warning", () => {
  const result = messages("title Broken\ncomponent Dup [0.2, 0.2]\ncomponent Dup [0.6, 0.6]\n");
  assert.ok(result.some((d) => d.severity === "warning" && /already declared/.test(d.message)));
});

test("evolve with a multi-word target does not produce spurious diagnostics", () => {
  const result = messages(
    "title Broken\ncomponent Cup of Tea [0.2, 0.2]\nevolve Cup of Tea 0.5\n",
  );
  const evolveLineDiagnostics = result.filter((d) => d.line === 2);
  assert.deepEqual(evolveLineDiagnostics, []);
});

test("y-axis is an Information notice, because cli-owm ignores it", () => {
  const result = messages("title Tea Shop\ny-axis Custom->Labels\ncomponent Foo [0.5, 0.5]\n");
  assert.ok(result.some((d) => d.severity === "information" && /does not support 'y-axis'/.test(d.message)));
});

test("a cli-owm ParseError surfaces as an Error", () => {
  const result = messages("title Broken\ngibberish line here\n");
  assert.ok(result.some((d) => d.severity === "error" && /ParseError/.test(d.message)));
});

test("a cli-owm ParseError lands on the physical line that is malformed", () => {
  // Body line 0: title, 1: a valid component, 2: a valid component,
  // 3: the malformed line, 4: a valid link.
  const result = messages(
    "title Broken\ncomponent Foo [0.5, 0.5]\ncomponent Bar [0.2, 0.2]\nthis line is nonsense\nFoo->Bar\n",
  );
  const parseErrors = result.filter((d) => /ParseError/.test(d.message));
  assert.equal(parseErrors.length, 1);
  assert.equal(parseErrors[0].line, 3);
  assert.match(parseErrors[0].message, /on line 4\./);
});

test("a ParseError line is offset by the config header, like every other diagnostic", () => {
  // Header lines 0-2 ("---", "theme: dark", "---"), body line 0: title,
  // body line 1: the malformed line -> fence line 4.
  const result = messages("---\ntheme: dark\n---\ntitle Broken\nthis line is nonsense\n");
  const parseErrors = result.filter((d) => /ParseError/.test(d.message));
  assert.equal(parseErrors.length, 1);
  assert.equal(parseErrors[0].line, 4);
});

test("exactly 0 and exactly 1 are valid coordinates, not out-of-range warnings", () => {
  assert.deepEqual(collectFenceDiagnostics("title Edges\ncomponent X [0, 1]\n"), []);
  assert.deepEqual(collectFenceDiagnostics("title Edges\ncomponent Y [1, 0]\n"), []);
});

test("evolve with a trailing label offset does not mistake the offset for the maturity", () => {
  const result = messages(
    "title Tea Shop\ncomponent Kettle [0.43, 0.35] label [-57, 4]\nevolve Kettle 0.62 label [16, 7]\n",
  );
  assert.deepEqual(result, []);
});

test("evolve's -> rename form validates only the original name", () => {
  const result = messages(
    "title Tea Shop\ncomponent Kettle [0.43, 0.35]\nevolve Kettle->Electric Kettle 0.62\n",
  );
  assert.deepEqual(result, []);
});

test("evolve's -> rename form still catches an undeclared original name", () => {
  const result = messages("title Tea Shop\nevolve Ghost->Spectre 0.62\n");
  assert.ok(result.some((d) => d.severity === "warning" && /undeclared component 'Ghost'/.test(d.message)));
});

test("a pipeline referencing its declared component is not a duplicate declaration", () => {
  const result = messages(
    "title Tea Shop\ncomponent Kettle [0.43, 0.35]\npipeline Kettle [0.20, 0.80]\n",
  );
  assert.deepEqual(result, []);
});

test("a block-form pipeline is not a duplicate declaration either", () => {
  const result = messages(
    "title Tea Shop\ncomponent Kettle [0.43, 0.35]\npipeline Kettle\n{\n  component Electric Kettle [0.63]\n}\n",
  );
  assert.deepEqual(result, []);
});

test("custom x-axis labels are not read as a component link", () => {
  const result = messages(
    "title Tea Shop\nevolution Novel->Emerging->Good->Best\ncomponent Kettle [0.43, 0.35]\n",
  );
  assert.deepEqual(result, []);
});

test("a y-axis line produces the information notice and nothing else", () => {
  const result = messages("title Tea Shop\ny-axis Profit|Low|High\ncomponent Kettle [0.43, 0.35]\n");
  assert.equal(result.length, 1);
  assert.equal(result[0].severity, "information");
  assert.equal(result[0].line, 1);
});

test("an unknown config key still surfaces from the header, as Information", () => {
  const result = messages("---\ncolor: red\n---\ntitle Tea Shop\n");
  assert.ok(result.some((d) => d.severity === "information" && /Unknown/.test(d.message)));
});
