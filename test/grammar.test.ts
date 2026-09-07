import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs";
import { Registry, parseRawGrammar } from "vscode-textmate";
import { loadWASM, OnigScanner, OnigString } from "vscode-oniguruma";

let registryPromise: Promise<Registry> | undefined;

function getRegistry(): Promise<Registry> {
  if (!registryPromise) {
    registryPromise = (async () => {
      const wasmPath = path.join(path.dirname(require.resolve("vscode-oniguruma/package.json")), "release/onig.wasm");
      const wasmBin = fs.readFileSync(wasmPath);
      await loadWASM(wasmBin.buffer);
      return new Registry({
        onigLib: Promise.resolve({
          createOnigScanner: (patterns: string[]) => new OnigScanner(patterns),
          createOnigString: (value: string) => new OnigString(value),
        }),
        loadGrammar: async () => {
          const grammarPath = path.join(__dirname, "../syntaxes/owm.tmLanguage.json");
          return parseRawGrammar(fs.readFileSync(grammarPath, "utf8"), grammarPath);
        },
      });
    })();
  }
  return registryPromise;
}

async function tokenize(line: string): Promise<string[]> {
  const registry = await getRegistry();
  const grammar = await registry.loadGrammar("source.owm");
  if (!grammar) {
    throw new Error("failed to load source.owm grammar");
  }
  const result = grammar.tokenizeLine(line, null);
  return result.tokens.map((token) => line.slice(token.startIndex, token.endIndex));
}

test("component keyword is scoped", async () => {
  const registry = await getRegistry();
  const grammar = await registry.loadGrammar("source.owm");
  const result = grammar!.tokenizeLine("component Cup of Tea [0.79, 0.61]", null);
  const keywordToken = result.tokens.find((token) => token.scopes.includes("keyword.control.owm"));
  assert.ok(keywordToken);
});

test("a decorator is scoped as support.function.decorator.owm", async () => {
  const registry = await getRegistry();
  const grammar = await registry.loadGrammar("source.owm");
  const result = grammar!.tokenizeLine("component Vendor [0.2, 0.5] (buy)", null);
  const decoratorToken = result.tokens.find((token) => token.scopes.includes("support.function.decorator.owm"));
  assert.ok(decoratorToken);
});

test("a line comment is scoped", async () => {
  const registry = await getRegistry();
  const grammar = await registry.loadGrammar("source.owm");
  const result = grammar!.tokenizeLine("// this is a comment", null);
  const commentToken = result.tokens.find((token) => token.scopes.includes("comment.line.double-slash.owm"));
  assert.ok(commentToken);
});

test("an arrow link is scoped as an operator", async () => {
  const registry = await getRegistry();
  const grammar = await registry.loadGrammar("source.owm");
  const result = grammar!.tokenizeLine("Foo->Bar", null);
  const arrowToken = result.tokens.find((token) => token.scopes.includes("keyword.operator.arrow.owm"));
  assert.ok(arrowToken);
});
