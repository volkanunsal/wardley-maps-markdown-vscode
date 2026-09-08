import { parse, render, themes } from "cli-owm";
import type { MapTheme, RenderOptions } from "cli-owm";
import { logDiagnostic } from "./diagnostics/logger";
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

export function decodeBase64Utf8(encodedValue: string): string {
  if (encodedValue === "") {
    return "";
  }
  const binaryString = atob(encodedValue);
  const bytes = Uint8Array.from(binaryString, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function decodeBase64Attribute(element: Element, attributeName: string): string {
  return decodeBase64Utf8(element.getAttribute(attributeName) || "");
}

function showErrorCard(element: HTMLElement, message: string): void {
  const ownerDocument = element.ownerDocument;
  const errorCard = ownerDocument.createElement("div");
  errorCard.className = "wardley-error";
  errorCard.textContent = `Wardley map error: ${message}`;
  element.innerHTML = "";
  element.append(errorCard);
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const zoomPanDisposers = new WeakMap<HTMLElement, () => void>();

function releaseZoomPan(element: HTMLElement): void {
  const previousDisposer = zoomPanDisposers.get(element);
  if (previousDisposer) {
    zoomPanDisposers.delete(element);
    previousDisposer();
  }
}

export function createRenderer(deps: RendererDeps): {
  renderAll(root: ParentNode): void;
  renderOne(element: HTMLElement): void;
  reRenderAll(root: ParentNode): void;
} {
  function renderOne(element: HTMLElement): void {
    releaseZoomPan(element);
    try {
      const source = decodeBase64Attribute(element, "data-source");
      const rawConfig = decodeBase64Attribute(element, "data-config");
      const config: { theme?: string; width?: number; height?: number } = rawConfig
        ? JSON.parse(rawConfig)
        : {};

      const defaultThemeName = deps.getDefaultTheme?.() ?? "wardley";
      // cli-owm is lenient: a construct it does not fully support (`y-axis`,
      // for one) lands a non-fatal ParseError in map.errors while render()
      // still returns a complete SVG for everything else. Those belong in the
      // editor's diagnostics, not in a blanked preview, so the error card is
      // reserved for a render that actually failed.
      const { svg } = renderSource(source, config, defaultThemeName);

      if (typeof svg !== "string" || svg.trim() === "") {
        showErrorCard(element, "the renderer produced no output for this map");
        return;
      }

      element.innerHTML = svg;

      const svgElement = element.querySelector("svg");
      if (svgElement) {
        const viewport = element.ownerDocument.createElement("div");
        viewport.className = "wardley-zoom-viewport";
        viewport.appendChild(svgElement);
        element.appendChild(viewport);
        zoomPanDisposers.set(element, attachZoomPan(element, viewport, svgElement));
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
