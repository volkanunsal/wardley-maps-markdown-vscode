import { test } from "node:test";
import assert from "node:assert/strict";
import { logDiagnostic } from "../../src/diagnostics/logger";

function captureConsoleError(run: () => void): string[] {
  const captured: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    captured.push(args.map(String).join(" "));
  };
  try {
    run();
  } finally {
    console.error = originalConsoleError;
  }
  return captured;
}

test("logs to console.error with the extension label prefix and the serialized details", () => {
  const captured = captureConsoleError(() => {
    logDiagnostic("render threw", { fence: "title Tea Shop" });
  });
  assert.equal(captured.length, 1);
  assert.match(captured[0], /^\[wardley-maps-markdown-vscode\] render threw\n/);
  assert.match(captured[0], /"fence": "title Tea Shop"/);
});

test("serializes an Error value as name, message, and stack rather than an empty object", () => {
  const captured = captureConsoleError(() => {
    logDiagnostic("parse threw", { error: new TypeError("bad input") });
  });
  const serialized = captured[0];
  assert.match(serialized, /"name": "TypeError"/);
  assert.match(serialized, /"message": "bad input"/);
  assert.match(serialized, /"stack":/);
});
