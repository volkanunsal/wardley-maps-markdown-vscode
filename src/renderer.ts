import { parse, render, themes } from "cli-owm";
import type { MapTheme, RenderOptions } from "cli-owm";
import { attachZoomPan } from "./zoomPan";

export interface WardleyRenderResult {
  svg: string;
  errors: Array<{ name: string; line: number }>;
}

type ThemeName = keyof typeof themes;

export function resolveTheme(requested: string | undefined, fallback: string): MapTheme {
  const requestedKey = requested as ThemeName | undefined;
  const fallbackKey = fallback as ThemeName;
  if (requestedKey && themes[requestedKey]) {
    return themes[requestedKey];
  }
  return themes[fallbackKey] ?? themes.wardley;
}

export function renderSource(
  source: string,
  config: { theme?: string; width?: number; height?: number },
  defaultThemeName: string,
): WardleyRenderResult {
  const map = parse(source);
  const options: RenderOptions = {
    width: config.width,
    height: config.height,
    theme: resolveTheme(config.theme, defaultThemeName),
  };
  const svg = render(map, options);
  return { svg, errors: map.errors };
}

export interface RendererDeps {
  getDefaultTheme?: () => string;
}

function decodeBase64Attribute(element: Element, attributeName: string): string {
  const encodedValue = element.getAttribute(attributeName) || "";
  return atob(encodedValue);
}

function showErrorCard(element: HTMLElement, message: string): void {
  const ownerDocument = element.ownerDocument;
  const errorCard = ownerDocument.createElement("div");
  errorCard.className = "wardley-error";
  errorCard.textContent = `Wardley map error: ${message}`;
  element.innerHTML = "";
  element.append(errorCard);
}

function logDiagnostic(label: string, details: Record<string, unknown>): void {
  const serialized = JSON.stringify(
    details,
    (_key, value) =>
      value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value,
    2,
  );
  console.error(`[wardley-maps-markdown-vscode] ${label}\n${serialized}`);
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createRenderer(deps: RendererDeps): {
  renderAll(root: ParentNode): void;
  renderOne(element: HTMLElement): void;
  reRenderAll(root: ParentNode): void;
} {
  function renderOne(element: HTMLElement): void {
    try {
      const source = decodeBase64Attribute(element, "data-source");
      const rawConfig = decodeBase64Attribute(element, "data-config");
      const config: { theme?: string; width?: number; height?: number } = rawConfig
        ? JSON.parse(rawConfig)
        : {};

      const defaultThemeName = deps.getDefaultTheme?.() ?? "wardley";
      const { svg, errors } = renderSource(source, config, defaultThemeName);

      if (errors.length > 0) {
        const [firstError] = errors;
        showErrorCard(element, `${firstError.name} at line ${firstError.line}`);
        return;
      }

      element.innerHTML = svg;

      const svgElement = element.querySelector("svg");
      if (svgElement) {
        const viewport = element.ownerDocument.createElement("div");
        viewport.className = "wardley-zoom-viewport";
        viewport.appendChild(svgElement);
        element.appendChild(viewport);
        attachZoomPan(element, viewport, svgElement);
      }
    } catch (renderError) {
      logDiagnostic("render threw", { error: renderError, message: messageFromError(renderError) });
      showErrorCard(element, messageFromError(renderError));
    } finally {
      element.setAttribute("data-rendered", "true");
    }
  }

  function renderAll(root: ParentNode): void {
    root
      .querySelectorAll('.wardley-map[data-source]:not([data-rendered="true"])')
      .forEach((element) => renderOne(element as HTMLElement));
  }

  function reRenderAll(root: ParentNode): void {
    root.querySelectorAll(".wardley-map[data-source]").forEach((element) => renderOne(element as HTMLElement));
  }

  return { renderAll, renderOne, reRenderAll };
}
