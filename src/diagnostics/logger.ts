export function logDiagnostic(label: string, details: Record<string, unknown>): void {
  const serialized = JSON.stringify(
    details,
    (_key, value) =>
      value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value,
    2,
  );
  console.error(`[wardley-maps-markdown-vscode] ${label}\n${serialized}`);
}
