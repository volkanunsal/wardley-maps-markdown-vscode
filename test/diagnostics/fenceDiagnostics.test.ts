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

test("y-axis is an Information notice, because cli-owm ignores it", () => {
  const result = messages("title Tea Shop\ny-axis Custom->Labels\ncomponent Foo [0.5, 0.5]\n");
  assert.ok(result.some((d) => d.severity === "information" && /does not support 'y-axis'/.test(d.message)));
});

test("a cli-owm ParseError surfaces as an Error", () => {
  const result = messages("title Broken\ngibberish line here\n");
  assert.ok(result.some((d) => d.severity === "error" && /ParseError/.test(d.message)));
});

test("an unknown config key still surfaces from the header, as Information", () => {
  const result = messages("---\ncolor: red\n---\ntitle Tea Shop\n");
  assert.ok(result.some((d) => d.severity === "information" && /Unknown/.test(d.message)));
});
