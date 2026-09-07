import * as MarkdownItModule from "markdown-it";
import * as vscode from "vscode";
import { wardleyMapsPlugin } from "./markdownItPlugin";
import { computeDocumentDiagnostics } from "./diagnostics/documentDiagnostics";

type MarkdownItInstance = ReturnType<typeof MarkdownItModule.default>;

const DEBOUNCE_MS = 300;

function urisOfTab(tab: vscode.Tab): vscode.Uri[] {
  const input = tab.input;
  if (input instanceof vscode.TabInputText) {
    return [input.uri];
  }
  if (input instanceof vscode.TabInputTextDiff) {
    return [input.original, input.modified];
  }
  return [];
}

function isDiagnosableDocument(document: vscode.TextDocument): boolean {
  return (
    document.languageId === "markdown" &&
    (document.uri.scheme === "file" || document.uri.scheme === "untitled")
  );
}

export function activate(context: vscode.ExtensionContext) {
  const collection = vscode.languages.createDiagnosticCollection("wardley-maps-markdown");
  context.subscriptions.push(collection);

  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  context.subscriptions.push({
    dispose: () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    },
  });

  function severityFor(severity: "error" | "warning" | "information"): vscode.DiagnosticSeverity {
    switch (severity) {
      case "error":
        return vscode.DiagnosticSeverity.Error;
      case "warning":
        return vscode.DiagnosticSeverity.Warning;
      case "information":
        return vscode.DiagnosticSeverity.Information;
    }
  }

  function refresh(document: vscode.TextDocument): void {
    if (!isDiagnosableDocument(document)) {
      return;
    }
    const diagnostics = computeDocumentDiagnostics(document.getText()).map(
      (diagnostic) =>
        new vscode.Diagnostic(
          new vscode.Range(diagnostic.line, diagnostic.startColumn, diagnostic.line, diagnostic.endColumn),
          diagnostic.message,
          severityFor(diagnostic.severity),
        ),
    );
    collection.set(document.uri, diagnostics);
  }

  function scheduleRefresh(document: vscode.TextDocument): void {
    if (!isDiagnosableDocument(document)) {
      return;
    }
    const key = document.uri.toString();
    const existingTimer = timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    timers.set(
      key,
      setTimeout(() => {
        timers.delete(key);
        refresh(document);
      }, DEBOUNCE_MS),
    );
  }

  function clearForUri(uri: vscode.Uri): void {
    const key = uri.toString();
    const existingTimer = timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timers.delete(key);
    }
    collection.delete(uri);
  }

  function isUriStillVisible(uri: vscode.Uri): boolean {
    const key = uri.toString();
    return vscode.window.tabGroups.all.some((group) =>
      group.tabs.some((tab) => urisOfTab(tab).some((tabUri) => tabUri.toString() === key)),
    );
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(refresh),
    vscode.workspace.onDidChangeTextDocument((event) => scheduleRefresh(event.document)),
    vscode.window.tabGroups.onDidChangeTabs((event) => {
      for (const tab of event.closed) {
        for (const uri of urisOfTab(tab)) {
          if (!isUriStillVisible(uri)) {
            clearForUri(uri);
          }
        }
      }
    }),
  );

  for (const document of vscode.workspace.textDocuments) {
    refresh(document);
  }

  return {
    extendMarkdownIt(markdownItInstance: MarkdownItInstance): MarkdownItInstance {
      wardleyMapsPlugin(markdownItInstance);
      return markdownItInstance;
    },
  };
}

export function deactivate(): void {}
