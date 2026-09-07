const MIN_SCALE = 0.2;
const MAX_SCALE = 5;
const ZOOM_STEP = 1.2;

interface ZoomPanState {
  scale: number;
  translateX: number;
  translateY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// The initial view is always scale 1, translate (0, 0), never a fit-to-view
// computation -- an auto-shrink-to-fit crushes tall-but-narrow maps down to
// a fraction of a readable size just to satisfy a height cap. Zooming
// beyond that is an explicit user action (buttons or ctrl/cmd+scroll).
const INITIAL_STATE: ZoomPanState = { scale: 1, translateX: 0, translateY: 0 };

function isPanModifierPressed(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

export function attachZoomPan(
  diagramElement: HTMLElement,
  viewport: HTMLElement,
  svg: SVGElement,
): void {
  const ownerDocument = diagramElement.ownerDocument;
  const state: ZoomPanState = { ...INITIAL_STATE };

  function applyTransform(): void {
    svg.style.transformOrigin = "0 0";
    svg.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
  }

  function setTextSelectable(selectable: boolean): void {
    viewport.style.userSelect = selectable ? "" : "none";
    viewport.style.setProperty("-webkit-user-select", selectable ? "" : "none");
  }

  function updatePointerAffordance(event?: MouseEvent): void {
    const canPan = state.scale > 1 || (event ? isPanModifierPressed(event) : false);
    viewport.style.cursor = canPan ? "grab" : "default";
    setTextSelectable(!canPan);
  }

  function zoomAt(anchorX: number, anchorY: number, factor: number): void {
    const newScale = clamp(state.scale * factor, MIN_SCALE, MAX_SCALE);
    if (newScale === state.scale) {
      return;
    }
    const ratio = newScale / state.scale;
    state.translateX = anchorX - (anchorX - state.translateX) * ratio;
    state.translateY = anchorY - (anchorY - state.translateY) * ratio;
    state.scale = newScale;
    applyTransform();
  }

  function zoomAtViewportCenter(factor: number): void {
    const rect = viewport.getBoundingClientRect();
    zoomAt(rect.width / 2, rect.height / 2, factor);
  }

  function reset(): void {
    state.scale = INITIAL_STATE.scale;
    state.translateX = INITIAL_STATE.translateX;
    state.translateY = INITIAL_STATE.translateY;
    applyTransform();
  }

  const controls = ownerDocument.createElement("div");
  controls.className = "wardley-zoom-controls";

  const zoomOutButton = ownerDocument.createElement("button");
  zoomOutButton.type = "button";
  zoomOutButton.className = "wardley-zoom-out";
  zoomOutButton.setAttribute("aria-label", "Zoom out");
  zoomOutButton.textContent = "−";
  zoomOutButton.addEventListener("click", () => {
    zoomAtViewportCenter(1 / ZOOM_STEP);
  });

  const resetButton = ownerDocument.createElement("button");
  resetButton.type = "button";
  resetButton.className = "wardley-zoom-reset";
  resetButton.setAttribute("aria-label", "Reset zoom");
  resetButton.textContent = "⟲";
  resetButton.addEventListener("click", reset);

  const zoomInButton = ownerDocument.createElement("button");
  zoomInButton.type = "button";
  zoomInButton.className = "wardley-zoom-in";
  zoomInButton.setAttribute("aria-label", "Zoom in");
  zoomInButton.textContent = "+";
  zoomInButton.addEventListener("click", () => {
    zoomAtViewportCenter(ZOOM_STEP);
  });

  controls.append(zoomOutButton, resetButton, zoomInButton);
  diagramElement.prepend(controls);

  viewport.addEventListener(
    "wheel",
    (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      const rect = viewport.getBoundingClientRect();
      const anchorX = event.clientX - rect.left;
      const anchorY = event.clientY - rect.top;
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomAt(anchorX, anchorY, factor);
    },
    { passive: false },
  );

  let dragging = false;
  let dragStartClientX = 0;
  let dragStartClientY = 0;
  let dragStartTranslateX = 0;
  let dragStartTranslateY = 0;

  viewport.addEventListener("mousedown", (event: MouseEvent) => {
    if (state.scale <= 1 && !isPanModifierPressed(event)) {
      return;
    }
    dragging = true;
    dragStartClientX = event.clientX;
    dragStartClientY = event.clientY;
    dragStartTranslateX = state.translateX;
    dragStartTranslateY = state.translateY;
    viewport.classList.add("wardley-zoom-dragging");
    viewport.style.cursor = "grabbing";
    setTextSelectable(false);
  });

  viewport.addEventListener("mousemove", (event: MouseEvent) => {
    if (!dragging) {
      updatePointerAffordance(event);
    }
  });

  ownerDocument.addEventListener("mousemove", (event: MouseEvent) => {
    if (!dragging) {
      return;
    }
    state.translateX = dragStartTranslateX + (event.clientX - dragStartClientX);
    state.translateY = dragStartTranslateY + (event.clientY - dragStartClientY);
    applyTransform();
  });

  ownerDocument.addEventListener("mouseup", (event: MouseEvent) => {
    if (!dragging) {
      return;
    }
    dragging = false;
    viewport.classList.remove("wardley-zoom-dragging");
    updatePointerAffordance(event);
  });

  applyTransform();
  updatePointerAffordance();
}
