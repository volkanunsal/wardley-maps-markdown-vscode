import * as MarkdownItModule from "markdown-it";
import type { RendererRule } from "markdown-it";
import { parseConfigHeader } from "./config";

type MarkdownItInstance = ReturnType<typeof MarkdownItModule.default>;

const FENCE_INFOS = new Set(["owm", "wardley"]);

export function wardleyMapsPlugin(markdownItInstance: MarkdownItInstance): void {
  const defaultFenceRenderer = markdownItInstance.renderer.rules.fence!.bind(
    markdownItInstance.renderer,
  );

  const wardleyFenceRenderer: RendererRule = (tokens, tokenIndex, options, env, self) => {
    const token = tokens[tokenIndex];
    const fenceInfo = token.info.trim();

    if (!FENCE_INFOS.has(fenceInfo)) {
      return defaultFenceRenderer(tokens, tokenIndex, options, env, self);
    }

    const { config, body } = parseConfigHeader(token.content);
    const encodedSource = Buffer.from(body, "utf8").toString("base64");
    const encodedConfig = Buffer.from(JSON.stringify(config), "utf8").toString("base64");

    return `<div class="wardley-map" data-source="${encodedSource}" data-config="${encodedConfig}"></div>\n`;
  };

  markdownItInstance.renderer.rules.fence = wardleyFenceRenderer;
}
