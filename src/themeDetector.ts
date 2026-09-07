export type WardleyThemeName = "plain" | "handwritten" | "wardley" | "dark" | "colour";

const themeClassMap: Record<string, WardleyThemeName> = {
  "vscode-dark": "dark",
  "vscode-light": "wardley",
  "vscode-high-contrast": "plain",
  "vscode-high-contrast-light": "plain",
};

export function detectVsCodeTheme(document: Document): WardleyThemeName {
  const bodyClassList = document.body.classList;
  for (const [vscodeClass, themeName] of Object.entries(themeClassMap)) {
    if (bodyClassList.contains(vscodeClass)) {
      return themeName;
    }
  }
  return "wardley";
}
