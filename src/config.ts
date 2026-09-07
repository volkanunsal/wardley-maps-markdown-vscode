import type { FenceDiagnostic } from "./diagnostics/types";

export interface WardleyConfig {
  theme?: string;
  width?: number;
  height?: number;
}

const numericKeys = new Set(["width", "height"]);
const themeValues = new Set(["plain", "handwritten", "wardley", "dark", "colour"]);
const allowedKeys = new Set(["theme", "width", "height"]);

function stripSurroundingQuotes(value: string): string {
  const isDoubleQuoted = value.length >= 2 && value.startsWith('"') && value.endsWith('"');
  const isSingleQuoted = value.length >= 2 && value.startsWith("'") && value.endsWith("'");
  if (isDoubleQuoted || isSingleQuoted) {
    return value.slice(1, -1);
  }
  return value;
}

export function parseConfigHeader(raw: string): {
  config: WardleyConfig;
  body: string;
  headerDiagnostics: FenceDiagnostic[];
  headerLineCount: number;
} {
  const lines = raw.replace(/\r\n?/g, "\n").split("\n");

  if (lines[0]?.trim() !== "---") {
    return { config: {}, body: raw, headerDiagnostics: [], headerLineCount: 0 };
  }

  const config: Record<string, unknown> = {};
  const headerDiagnostics: FenceDiagnostic[] = [];
  let closingDelimiterIndex = -1;

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    if (lines[lineIndex].trim() === "---") {
      closingDelimiterIndex = lineIndex;
      break;
    }
  }

  if (closingDelimiterIndex === -1) {
    return { config: {}, body: raw, headerDiagnostics: [], headerLineCount: 0 };
  }

  for (let lineIndex = 1; lineIndex < closingDelimiterIndex; lineIndex++) {
    const line = lines[lineIndex];
    const match = line.match(/^([a-zA-Z]+):\s*(.+)$/);
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    const trimmedValue = rawValue.trim();
    const valueStart = line.indexOf(trimmedValue, key.length + 1);
    const valueEnd = Math.max(valueStart + trimmedValue.length, valueStart + 1);

    if (!allowedKeys.has(key)) {
      headerDiagnostics.push({
        line: lineIndex,
        startColumn: 0,
        endColumn: key.length,
        message: `Unknown Wardley map config key '${key}'.`,
        severity: "information",
      });
      continue;
    }

    if (numericKeys.has(key)) {
      const numericValue = Number(trimmedValue);
      if (!Number.isFinite(numericValue) || trimmedValue === "") {
        headerDiagnostics.push({
          line: lineIndex,
          startColumn: valueStart,
          endColumn: valueEnd,
          message: `'${key}' must be a number, got '${trimmedValue}'.`,
          severity: "error",
        });
      } else {
        config[key] = numericValue;
      }
    } else {
      const value = stripSurroundingQuotes(trimmedValue);
      if (key === "theme" && !themeValues.has(value)) {
        headerDiagnostics.push({
          line: lineIndex,
          startColumn: valueStart,
          endColumn: valueEnd,
          message: `Invalid theme '${value}'. Valid values: plain, handwritten, wardley, dark, colour.`,
          severity: "error",
        });
      } else {
        config[key] = value;
      }
    }
  }

  const body = lines.slice(closingDelimiterIndex + 1).join("\n");
  return {
    config: config as WardleyConfig,
    body,
    headerDiagnostics,
    headerLineCount: closingDelimiterIndex + 1,
  };
}
