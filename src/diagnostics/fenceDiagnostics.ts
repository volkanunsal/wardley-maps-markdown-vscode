import { parse } from "cli-owm";
import { parseConfigHeader } from "../config";
import { logDiagnostic } from "./logger";
import type { FenceDiagnostic } from "./types";

// `pipeline` is deliberately absent: in OWM `pipeline Kettle` always references
// an already-declared `component Kettle`, it never declares a fresh name.
const DECLARATION_KEYWORDS = /^(component|anchor|submap|market|ecosystem)\s+(.+?)(?:\s*\[|\s*\{|\s*$)/;
const COORDINATE_STATEMENT = /^(component|anchor)\s+.+?\s*\[\s*([^,\]]+?)\s*,\s*([^,\]]+?)\s*\]/;
const EVOLVE_STATEMENT = /^evolve\s+(.+)$/;
const TRAILING_LABEL_OFFSET = /\s*label\s*\[[^\]]*\]\s*$/;
const NUMERIC_LOOKING = /^[-+0-9.eE]+$/;
const LINK_STATEMENT = /^(.+?)\s*->\s*(.+?)$/;
// Axis-label statements also contain `->`, but they are not links.
const AXIS_LABEL_STATEMENT = /^(evolution|x-axis|y-axis)\b/;
const Y_AXIS_STATEMENT = /^y-axis\b/;

function parseCoordinate(raw: string): number | null {
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function splitEvolveStatement(remainder: string): { name: string; rawMaturity: string | null } {
  const withoutLabel = remainder.replace(TRAILING_LABEL_OFFSET, "").trim();
  const lastSpaceIndex = withoutLabel.lastIndexOf(" ");
  const lastToken = lastSpaceIndex === -1 ? "" : withoutLabel.slice(lastSpaceIndex + 1);
  const hasMaturityToken = lastToken !== "" && NUMERIC_LOOKING.test(lastToken);
  const rawName = hasMaturityToken ? withoutLabel.slice(0, lastSpaceIndex) : withoutLabel;
  // `evolve Old->New 0.62` renames on evolution: only the left-hand side names
  // an existing component, the right-hand side is the new display label.
  const name = rawName.split("->")[0].trim();
  return { name, rawMaturity: hasMaturityToken ? lastToken : null };
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
  const yAxisLines = new Set<number>();

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
      yAxisLines.add(index);
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
      const { name, rawMaturity } = splitEvolveStatement(evolveMatch[1]);
      if (name !== "") {
        evolveStatements.push({ name, line: index });
      }
      if (rawMaturity !== null) {
        const value = parseCoordinate(rawMaturity);
        if (value === null) {
          pushDiagnostic(index, `maturity must be a number, got '${rawMaturity}'.`, "error");
        } else if (value < 0 || value > 1) {
          pushDiagnostic(index, `maturity ${value} is outside the valid range [0, 1].`, "warning");
        }
      }
      return;
    }

    if (line.includes("->") && !AXIS_LABEL_STATEMENT.test(line)) {
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
      // cli-owm's ParseError.line is already zero-indexed against the source it
      // was handed (BaseStrategyRunner/LinksExtractionStrategy both report the
      // raw loop index), so it needs no adjustment here -- only the human-facing
      // message converts to the one-indexed number shown in the editor gutter.
      const zeroIndexedLine = Math.max(0, parseError.line);
      if (yAxisLines.has(zeroIndexedLine)) {
        // Already reported, more precisely, as the y-axis information notice.
        continue;
      }
      pushDiagnostic(
        zeroIndexedLine,
        `${parseError.name} on line ${headerLineCount + zeroIndexedLine + 1}.`,
        "error",
      );
    }
  } catch (error) {
    logDiagnostic("cli-owm parse threw", { error, fenceContent });
  }

  return diagnostics;
}
