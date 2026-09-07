import { parse } from "cli-owm";
import { parseConfigHeader } from "../config";
import { logDiagnostic } from "./logger";
import type { FenceDiagnostic } from "./types";

const DECLARATION_KEYWORDS = /^(component|anchor|submap|market|ecosystem|pipeline)\s+(.+?)(?:\s*\[|\s*\{|\s*$)/;
const COORDINATE_STATEMENT = /^(component|anchor)\s+.+?\s*\[\s*([^,\]]+?)\s*,\s*([^,\]]+?)\s*\]/;
const EVOLVE_STATEMENT = /^evolve\s+(.+?)\s+([^\s[]+)/;
const LINK_STATEMENT = /^(.+?)\s*->\s*(.+?)$/;
const Y_AXIS_STATEMENT = /^y-axis\b/;

function parseCoordinate(raw: string): number | null {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function collectFenceDiagnostics(
  fenceContent: string,
  deps: { parse: typeof parse } = { parse },
): FenceDiagnostic[] {
  const { config, body, headerDiagnostics, headerLineCount } = parseConfigHeader(fenceContent);

  if (body.trim() === "") {
    return headerDiagnostics;
  }

  const diagnostics: FenceDiagnostic[] = [...headerDiagnostics];
  const bodyLines = body.replace(/\r\n?/g, "\n").split("\n");
  const declaredNames = new Map<string, number>();
  const linkStatements: Array<{ start: string; end: string; line: number }> = [];
  const evolveStatements: Array<{ name: string; line: number }> = [];

  function pushDiagnostic(index: number, message: string, severity: FenceDiagnostic["severity"]): void {
    diagnostics.push({
      line: headerLineCount + index,
      startColumn: 0,
      endColumn: bodyLines[index]?.length ?? 0,
      message,
      severity,
    });
  }

  bodyLines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("//") || line.startsWith("/*")) {
      return;
    }

    if (Y_AXIS_STATEMENT.test(line)) {
      pushDiagnostic(
        index,
        "cli-owm does not support 'y-axis'; this map renders with the default value-chain labels.",
        "information",
      );
      return;
    }

    const declarationMatch = line.match(DECLARATION_KEYWORDS);
    if (declarationMatch) {
      const name = declarationMatch[2].trim();
      const existingLine = declaredNames.get(name);
      if (existingLine !== undefined) {
        pushDiagnostic(index, `'${name}' is already declared on line ${headerLineCount + existingLine + 1}.`, "warning");
      } else {
        declaredNames.set(name, index);
      }
    }

    const coordinateMatch = line.match(COORDINATE_STATEMENT);
    if (coordinateMatch) {
      const [, , rawVisibility, rawMaturity] = coordinateMatch;
      for (const [label, raw] of [
        ["visibility", rawVisibility],
        ["maturity", rawMaturity],
      ] as const) {
        const value = parseCoordinate(raw);
        if (value === null) {
          pushDiagnostic(index, `${label} must be a number, got '${raw}'.`, "error");
        } else if (value < 0 || value > 1) {
          pushDiagnostic(index, `${label} ${value} is outside the valid range [0, 1].`, "warning");
        }
      }
      return;
    }

    const evolveMatch = line.match(EVOLVE_STATEMENT);
    if (evolveMatch) {
      const [, name, rawMaturity] = evolveMatch;
      evolveStatements.push({ name: name.trim(), line: index });
      const value = parseCoordinate(rawMaturity);
      if (value === null) {
        pushDiagnostic(index, `maturity must be a number, got '${rawMaturity}'.`, "error");
      } else if (value < 0 || value > 1) {
        pushDiagnostic(index, `maturity ${value} is outside the valid range [0, 1].`, "warning");
      }
      return;
    }

    if (line.includes("->")) {
      const linkMatch = line.match(LINK_STATEMENT);
      if (linkMatch) {
        linkStatements.push({ start: linkMatch[1].trim(), end: linkMatch[2].trim(), line: index });
      }
    }
  });

  for (const evolveStatement of evolveStatements) {
    if (!declaredNames.has(evolveStatement.name)) {
      pushDiagnostic(
        evolveStatement.line,
        `'evolve' names undeclared component '${evolveStatement.name}'.`,
        "warning",
      );
    }
  }

  for (const link of linkStatements) {
    for (const name of [link.start, link.end]) {
      if (!declaredNames.has(name)) {
        pushDiagnostic(link.line, `Link references undeclared component '${name}'.`, "warning");
      }
    }
  }

  try {
    const map = deps.parse(body);
    for (const parseError of map.errors) {
      const zeroIndexedLine = Math.max(0, parseError.line - 1);
      pushDiagnostic(zeroIndexedLine, `${parseError.name} on line ${parseError.line}.`, "error");
    }
  } catch (error) {
    logDiagnostic("cli-owm parse threw", { error, fenceContent });
  }

  return diagnostics;
}
