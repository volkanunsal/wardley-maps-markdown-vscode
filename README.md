<p align="center">
  <img src="media/logo.png" alt="Wardley Maps for Markdown logo" width="128" height="128">
</p>

<h1 align="center">Wardley Maps for Markdown</h1>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=VolkanUnsal.wardley-maps-markdown-vscode"><img alt="Visual Studio Marketplace Version" src="https://img.shields.io/visual-studio-marketplace/v/VolkanUnsal.wardley-maps-markdown-vscode"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=VolkanUnsal.wardley-maps-markdown-vscode"><img alt="Visual Studio Marketplace Installs" src="https://img.shields.io/visual-studio-marketplace/i/VolkanUnsal.wardley-maps-markdown-vscode"></a>
  <a href="https://github.com/volkanunsal/wardley-maps-markdown-vscode/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/volkanunsal/wardley-maps-markdown-vscode/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://github.com/volkanunsal/wardley-maps-markdown-vscode/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/github/license/volkanunsal/wardley-maps-markdown-vscode"></a>
</p>

Renders Wardley maps written in the OnlineWardleyMaps (OWM) text format directly inside the VS Code Markdown preview, from an ```` ```owm ```` (or ```` ```wardley ````) fenced code block.

This is a different extension from [`damonsk.vscode-wardley-maps`](https://marketplace.visualstudio.com/items?itemName=damonsk.vscode-wardley-maps), the established `.owm`/`.wm` file editor with SVG/PNG export and publish-to-onlinewardleymaps.com support. The two are complementary and safe to install together: this extension never claims the `.owm` or `.wm` file extension, and only activates on Markdown fences. Use `damonsk.vscode-wardley-maps` to author and export standalone map files; use this extension to see a map render inline wherever it's embedded in prose — a strategy doc, a research report, a vault note.

## Usage

Fence a map with `owm` or `wardley` and preview the Markdown document as usual (`Cmd+Shift+V` / `Ctrl+Shift+V`):

````markdown
```owm
title Tea Shop
anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61]
Business->Cup of Tea
```
````

Any other fence info (` ```js `, ` ```yaml `, etc.) is untouched and falls through to markdown-it's default renderer.

## Configuration header

An optional YAML-style header before the map body sets render options:

````markdown
```owm
---
theme: dark
width: 900
---
title Tea Shop
anchor Business [0.95, 0.63]
component Cup of Tea [0.79, 0.61]
Business->Cup of Tea
```
````

| Key | Values | Default |
| --- | --- | --- |
| `theme` | `plain`, `handwritten`, `wardley`, `dark`, `colour` | auto — `dark` under a dark VS Code theme, `wardley` otherwise |
| `width` | integer px | renderer default |
| `height` | integer px | renderer default |

An unknown key is reported as a diagnostic on the host document; the map still renders.

## Map syntax

The renderer supports the OWM DSL: `title`, `anchor`/`component` with `[maturity, visibility]` coordinates and optional `label [x, y]` offsets, `build`/`buy`/`outsource`/`market`/`ecosystem`/`inertia` decorators, `evolve` (with an optional `->` rename and target maturity), `pipeline` in both header form (`pipeline Name [maturity]`) and block form (`pipeline Name { component ... }`), `submap` with a `url`, legacy `market`/`ecosystem`, `note`, `annotation`/`annotations`, custom `x-axis` labels (`evolution A->B->C->D`), `pioneers`/`settlers`/`townplanners` attitude boxes, `accelerator`/`deaccelerator`, `size`, `style`, and both `//` and `/* */` comments.

`examples/fidelity-corpus.md` in this repo has one worked fence per construct, useful as a reference or a copy-paste starting point.

Diagnostics report on the host document's real line numbers: parse errors from the OWM parser as errors, our own checks (out-of-range or non-numeric coordinates, a link or `evolve` referencing an undeclared component, duplicate component names) as warnings, and unknown config-header keys as informational.

## Known limitation: `y-axis`

Custom `y-axis` labels (`y-axis Profit|Low|High`) are recognized and syntax-highlighted but not rendered — the underlying renderer has no support for relabeling the vertical axis, so a map using this line renders with the default "Value Chain" caption instead. A fence containing `y-axis` gets an informational diagnostic noting this. Every other construct listed above, including block-form pipelines and the attitude boxes, renders correctly.
