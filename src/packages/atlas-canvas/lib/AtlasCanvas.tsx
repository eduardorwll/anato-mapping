import {
  ChevronRight,
  Crosshair,
  Hand,
  Layers,
  Maximize2,
  Minus,
  Plus,
} from "lucide-react";
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getAncestorChain,
  getCollapsibleTreeItems,
  getDescendantIds,
  resolveCategoryColorToken,
} from "../../category-tree/index";
import { cssVarForToken } from "../../design-tokens/index";
import {
  type Point2D,
  type Rect2D,
  type Size2D,
  type ViewportState,
  centerOnPercentPoint,
  clientPointToPercent,
  containerPointToPercent,
  fitImageToViewport,
  normalizeWheelFactor,
  zoomAtPoint,
} from "../../viewport-math/index";
import type {
  AtlasCanvasProps,
  CanvasBackdrop,
  CanvasLayerState,
} from "./types";

const BACKDROP_CLASS: Record<CanvasBackdrop, string> = {
  theme: "",
  dark: "canvas-backdrop-dark",
  checker: "canvas-backdrop-checker",
  light: "canvas-backdrop-light",
};

const BACKDROP_OPTIONS: ReadonlyArray<{ id: CanvasBackdrop; label: string }> = [
  { id: "theme", label: "Tema" },
  { id: "dark", label: "Escuro" },
  { id: "checker", label: "Xadrez" },
  { id: "light", label: "Claro" },
];

export function AtlasCanvas({
  imageUrl,
  imageAlt,
  pins,
  visiblePinIds,
  categories,
  mode,
  selectedPinId,
  activeCategoryFilterId,
  focusRequest,
  rightInsetPx = 0,
  onImageNaturalSize,
  onSelectPin,
  onCreatePin,
  onMovePin,
  onToggleCategoryFilter,
}: AtlasCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const zoomLabelRef = useRef<HTMLDivElement | null>(null);
  const pinAnchorRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const imageSizeRef = useRef<Size2D>({ width: 0, height: 0 });
  const viewportRef = useRef<ViewportState>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const viewportRafRef = useRef<number | null>(null);
  const cameraGlideRafRef = useRef<number | null>(null);
  const pinRafRef = useRef<number | null>(null);

  const [tool, setTool] = useState<"pin" | "pan">("pin");
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [isPanningVisual, setIsPanningVisual] = useState(false);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [legendCollapsedIds, setLegendCollapsedIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [layers, setLayers] = useState<CanvasLayerState>({
    showLabels: false,
    showNumbers: true,
    showLegend: true,
    backdrop: "theme",
  });

  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origOffsetX: number;
    origOffsetY: number;
    moved: boolean;
  } | null>(null);

  const pinDragRef = useRef<{
    pinId: string;
    pointerId: number;
    containerRect: Rect2D;
    startX: number;
    startY: number;
    latestPercent: Point2D;
    moved: boolean;
  } | null>(null);

  const cancelCameraGlide = useCallback(() => {
    if (cameraGlideRafRef.current !== null) {
      cancelAnimationFrame(cameraGlideRafRef.current);
      cameraGlideRafRef.current = null;
    }
  }, []);

  const flushViewportToDom = useCallback(() => {
    viewportRafRef.current = null;
    const world = worldRef.current;
    if (!world) return;
    const { offsetX, offsetY, scale } = viewportRef.current;
    world.style.transform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`;
    world.style.setProperty("--inv-scale", String(1 / Math.max(scale, 0.05)));
    if (zoomLabelRef.current) {
      zoomLabelRef.current.textContent = `${Math.round(scale * 100)}%`;
    }
  }, []);

  const scheduleViewportUpdate = useCallback(() => {
    if (viewportRafRef.current !== null) return;
    viewportRafRef.current = requestAnimationFrame(flushViewportToDom);
  }, [flushViewportToDom]);

  const setViewportImmediate = useCallback(
    (next: ViewportState) => {
      cancelCameraGlide();
      viewportRef.current = next;
      flushViewportToDom();
    },
    [cancelCameraGlide, flushViewportToDom],
  );

  // Interruptible ease-out camera glide for discrete actions (Focar, Ajustar, +/-).
  const glideViewportTo = useCallback(
    (target: ViewportState, durationMs = 210) => {
      cancelCameraGlide();
      const reduceMotion =
        typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) {
        viewportRef.current = target;
        flushViewportToDom();
        return;
      }

      const start = { ...viewportRef.current };
      const startTime = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        viewportRef.current = {
          scale: start.scale + (target.scale - start.scale) * eased,
          offsetX: start.offsetX + (target.offsetX - start.offsetX) * eased,
          offsetY: start.offsetY + (target.offsetY - start.offsetY) * eased,
        };
        flushViewportToDom();
        if (t < 1) {
          cameraGlideRafRef.current = requestAnimationFrame(step);
        } else {
          cameraGlideRafRef.current = null;
        }
      };

      cameraGlideRafRef.current = requestAnimationFrame(step);
    },
    [cancelCameraGlide, flushViewportToDom],
  );

  useEffect(() => {
    return () => {
      cancelCameraGlide();
      if (viewportRafRef.current !== null) {
        cancelAnimationFrame(viewportRafRef.current);
      }
      if (pinRafRef.current !== null) {
        cancelAnimationFrame(pinRafRef.current);
      }
    };
  }, [cancelCameraGlide]);

  const fitToContainer = useCallback(
    (options?: { sizeOverride?: Size2D; animate?: boolean }) => {
      const el = containerRef.current;
      const targetSize = options?.sizeOverride ?? imageSizeRef.current;
      if (!el || targetSize.width <= 0 || targetSize.height <= 0) return;
      const rect = el.getBoundingClientRect();
      const next = fitImageToViewport(targetSize, {
        width: rect.width || 1000,
        height: rect.height || 700,
      });
      if (options?.animate) {
        glideViewportTo(next);
      } else {
        setViewportImmediate(next);
      }
    },
    [glideViewportTo, setViewportImmediate],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      if (typing) return;

      if (e.code === "Space") {
        e.preventDefault();
        setSpaceHeld(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        fitToContainer({ animate: true });
      } else if (e.key === "h" || e.key === "H") {
        setTool("pan");
      } else if (e.key === "v" || e.key === "V") {
        setTool("pin");
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [fitToContainer]);

  // Smoothly glide viewport to pin when focusRequest triggers.
  useEffect(() => {
    if (
      !focusRequest ||
      !containerRef.current ||
      imageSizeRef.current.width <= 0
    ) {
      return;
    }
    const pin = pins.find((p) => p.id === focusRequest.pinId);
    if (!pin) return;
    const rect = containerRef.current.getBoundingClientRect();
    const target = centerOnPercentPoint(
      { x: pin.x, y: pin.y },
      imageSizeRef.current,
      { width: rect.width || 1000, height: rect.height || 700 },
      Math.max(viewportRef.current.scale, 1.4),
    );
    glideViewportTo(target);
  }, [focusRequest, glideViewportTo, pins]);

  const handleImageLoad = () => {
    const img = imageRef.current;
    if (!img) return;
    const nextSize = {
      width: img.naturalWidth || img.width || 1000,
      height: img.naturalHeight || img.height || 1000,
    };
    imageSizeRef.current = nextSize;
    onImageNaturalSize?.(nextSize);
    fitToContainer({ sizeOverride: nextSize, animate: false });
  };

  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    cancelCameraGlide();
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const anchor: Point2D = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    const factor = normalizeWheelFactor(e.deltaY, e.deltaMode);
    viewportRef.current = zoomAtPoint(viewportRef.current, factor, anchor);
    scheduleViewportUpdate();
  };

  const zoomByFactor = (factor: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const target = zoomAtPoint(viewportRef.current, factor, {
      x: rect.width / 2,
      y: rect.height / 2,
    });
    glideViewportTo(target, 160);
  };

  const isPanningIntent = mode === "visualize" || tool === "pan" || spaceHeld;

  const handleCanvasPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pinDragRef.current) return;
    const middleButton = e.button === 1;
    const leftButton = e.button === 0;
    if (!middleButton && !leftButton) return;

    if (middleButton || isPanningIntent) {
      cancelCameraGlide();
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setIsPanningVisual(true);
      panDragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origOffsetX: viewportRef.current.offsetX,
        origOffsetY: viewportRef.current.offsetY,
        moved: false,
      };
    }
  };

  const handleCanvasPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const drag = pinDragRef.current;
    if (drag && mode === "author") {
      if (
        !drag.moved &&
        Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) <= 2
      ) {
        return;
      }
      drag.moved = true;

      const size = imageSizeRef.current;
      let nextPercent: Point2D;
      if (size.width > 0 && size.height > 0) {
        nextPercent = containerPointToPercent(
          {
            x: e.clientX - drag.containerRect.left,
            y: e.clientY - drag.containerRect.top,
          },
          viewportRef.current,
          size,
        );
      } else if (imageRef.current) {
        nextPercent = clientPointToPercent(
          e.clientX,
          e.clientY,
          imageRef.current.getBoundingClientRect(),
        );
      } else {
        return;
      }

      drag.latestPercent = nextPercent;
      if (pinRafRef.current === null) {
        pinRafRef.current = requestAnimationFrame(() => {
          pinRafRef.current = null;
          const active = pinDragRef.current;
          if (!active) return;
          const anchorEl = pinAnchorRefs.current.get(active.pinId);
          if (anchorEl) {
            anchorEl.style.left = `${active.latestPercent.x}%`;
            anchorEl.style.top = `${active.latestPercent.y}%`;
          }
        });
      }
      return;
    }

    const pan = panDragRef.current;
    if (pan) {
      const dx = e.clientX - pan.startX;
      const dy = e.clientY - pan.startY;
      if (!pan.moved && Math.hypot(dx, dy) > 3) {
        pan.moved = true;
      }
      viewportRef.current = {
        ...viewportRef.current,
        offsetX: pan.origOffsetX + dx,
        offsetY: pan.origOffsetY + dy,
      };
      scheduleViewportUpdate();
    }
  };

  const handleCanvasPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pinDragRef.current) {
      const finished = pinDragRef.current;
      pinDragRef.current = null;
      if (pinRafRef.current !== null) {
        cancelAnimationFrame(pinRafRef.current);
        pinRafRef.current = null;
      }
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (finished.moved) {
        const anchorEl = pinAnchorRefs.current.get(finished.pinId);
        if (anchorEl) {
          anchorEl.style.left = `${finished.latestPercent.x}%`;
          anchorEl.style.top = `${finished.latestPercent.y}%`;
        }
        onMovePin?.(finished.pinId, finished.latestPercent);
      }
      return;
    }

    if (panDragRef.current) {
      const moved = panDragRef.current.moved;
      panDragRef.current = null;
      setIsPanningVisual(false);
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      if (!moved && e.target === e.currentTarget) {
        onSelectPin(null);
      }
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (mode !== "author" || isPanningIntent) return;
    const img = imageRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    const percent = clientPointToPercent(e.clientX, e.clientY, rect);
    onCreatePin?.(percent);
  };

  const legendData = useMemo(() => {
    const directCounts = new Map<string, number>();
    const activeIds = new Set<string>();
    for (const pin of pins) {
      if (!pin.categoryId) continue;
      directCounts.set(
        pin.categoryId,
        (directCounts.get(pin.categoryId) ?? 0) + 1,
      );
      for (const ancestor of getAncestorChain(categories, pin.categoryId)) {
        activeIds.add(ancestor.id);
      }
    }
    if (activeIds.size === 0) return [];

    const expandedIds = new Set<string>();
    for (const id of activeIds) {
      if (!legendCollapsedIds.has(id)) expandedIds.add(id);
    }

    return getCollapsibleTreeItems(categories, expandedIds, activeIds).map(
      (item) => {
        const descendants = getDescendantIds(categories, item.node.id);
        let count = 0;
        for (const id of descendants) {
          count += directCounts.get(id) ?? 0;
        }
        return { ...item, count };
      },
    );
  }, [categories, legendCollapsedIds, pins]);

  const pinIndexById = useMemo(() => {
    const map = new Map<string, number>();
    pins.forEach((p, idx) => map.set(p.id, idx + 1));
    return map;
  }, [pins]);

  const cursorClass = isPanningIntent
    ? isPanningVisual
      ? "cursor-grabbing"
      : "cursor-grab"
    : "cursor-crosshair";

  return (
    <div
      ref={containerRef}
      data-testid="atlas-canvas"
      onWheel={handleWheel}
      onPointerDown={handleCanvasPointerDown}
      onPointerMove={handleCanvasPointerMove}
      onPointerUp={handleCanvasPointerUp}
      className={`canvas-root relative h-full w-full overflow-hidden select-none ${BACKDROP_CLASS[layers.backdrop]} ${cursorClass}`}
      style={{
        backgroundColor:
          layers.backdrop === "theme" ? "var(--color-canvas)" : undefined,
      }}
    >
      <div ref={worldRef} className="canvas-world absolute left-0 top-0">
        <div className="relative inline-block leading-none">
          <img
            ref={imageRef}
            src={imageUrl}
            alt={imageAlt}
            draggable={false}
            decoding="async"
            onLoad={handleImageLoad}
            onClick={handleImageClick}
            className="block max-w-none select-none"
          />

          {pins.map((pin) => {
            if (!visiblePinIds.has(pin.id)) return null;
            const isSelected = pin.id === selectedPinId;
            const isHovered = pin.id === hoveredPinId;
            const colorToken = resolveCategoryColorToken(
              categories,
              pin.categoryId,
            );
            const pinNumber = pinIndexById.get(pin.id) ?? 1;

            return (
              <div
                key={pin.id}
                ref={(el) => {
                  if (el) {
                    pinAnchorRefs.current.set(pin.id, el);
                  } else {
                    pinAnchorRefs.current.delete(pin.id);
                  }
                }}
                className="canvas-pin-anchor absolute"
                style={{
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  zIndex: isSelected ? 30 : isHovered ? 25 : 10,
                }}
              >
                <button
                  type="button"
                  aria-label={pin.name || `Pin ${pinNumber}`}
                  data-testid={`canvas-pin-${pin.id}`}
                  onPointerEnter={() => setHoveredPinId(pin.id)}
                  onPointerLeave={() =>
                    setHoveredPinId((cur) => (cur === pin.id ? null : cur))
                  }
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    cancelCameraGlide();
                    onSelectPin(pin.id);
                    if (
                      mode === "author" &&
                      e.button === 0 &&
                      !isPanningIntent &&
                      containerRef.current
                    ) {
                      containerRef.current.setPointerCapture?.(e.pointerId);
                      const cRect = containerRef.current.getBoundingClientRect();
                      pinDragRef.current = {
                        pinId: pin.id,
                        pointerId: e.pointerId,
                        containerRect: {
                          left: cRect.left,
                          top: cRect.top,
                          width: cRect.width,
                          height: cRect.height,
                        },
                        startX: e.clientX,
                        startY: e.clientY,
                        latestPercent: { x: pin.x, y: pin.y },
                        moved: false,
                      };
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPin(pin.id);
                  }}
                  className="animate-pin-pop group relative flex items-center justify-center rounded-full focus:outline-none"
                  style={{
                    width: layers.showNumbers ? "22px" : "15px",
                    height: layers.showNumbers ? "22px" : "15px",
                    backgroundColor: cssVarForToken(colorToken),
                    border: "2.5px solid var(--pin-ring-color)",
                    boxShadow: isSelected
                      ? `0 0 0 4px var(--pin-selected-halo), 0 4px 12px var(--pin-ring-shadow)`
                      : `0 2px 8px var(--pin-ring-shadow)`,
                    cursor: mode === "author" ? "move" : "pointer",
                  }}
                >
                  {layers.showNumbers && (
                    <span
                      className="text-[10px] font-bold leading-none"
                      style={{
                        color: "var(--pin-number-color)",
                        textShadow: "0 0 2px var(--pin-number-glow)",
                      }}
                    >
                      {pinNumber}
                    </span>
                  )}
                </button>

                {(layers.showLabels || (isHovered && !isSelected)) && (
                  <div
                    role="tooltip"
                    className="animate-tooltip-in pointer-events-none absolute left-full top-1/2 ml-2 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium hud-surface"
                    style={{ color: "var(--color-foreground)" }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: cssVarForToken(colorToken) }}
                      />
                      {pin.name || `#${pinNumber}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom-Left Floating Controls */}
      <div
        className="pointer-events-auto absolute bottom-4 left-4 z-30 flex flex-col items-start gap-2"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {layersOpen && (
          <div
            className="animate-popover-up mb-1 w-56 rounded-xl p-3 text-xs hud-surface"
            style={{ color: "var(--color-foreground)" }}
          >
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center justify-between">
                <span>Rótulos</span>
                <input
                  type="checkbox"
                  checked={layers.showLabels}
                  onChange={(e) =>
                    setLayers((prev) => ({
                      ...prev,
                      showLabels: e.target.checked,
                    }))
                  }
                  style={{ accentColor: "var(--color-interest)" }}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between">
                <span>Números</span>
                <input
                  type="checkbox"
                  checked={layers.showNumbers}
                  onChange={(e) =>
                    setLayers((prev) => ({
                      ...prev,
                      showNumbers: e.target.checked,
                    }))
                  }
                  style={{ accentColor: "var(--color-interest)" }}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between">
                <span>Legenda</span>
                <input
                  type="checkbox"
                  checked={layers.showLegend}
                  onChange={(e) =>
                    setLayers((prev) => ({
                      ...prev,
                      showLegend: e.target.checked,
                    }))
                  }
                  style={{ accentColor: "var(--color-interest)" }}
                />
              </label>
            </div>

            <div
              className="mt-3 border-t pt-2.5"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div
                className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-muted-foreground)" }}
              >
                Fundo
              </div>
              <div className="grid grid-cols-2 gap-1">
                {BACKDROP_OPTIONS.map((opt) => {
                  const active = layers.backdrop === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setLayers((prev) => ({ ...prev, backdrop: opt.id }))
                      }
                      className="btn-tactile cursor-pointer rounded-md px-2 py-1 text-left text-[11px] font-medium"
                      style={{
                        backgroundColor: active
                          ? "var(--color-interest-soft)"
                          : "transparent",
                        color: active
                          ? "var(--color-interest)"
                          : "var(--color-muted-foreground)",
                        border: active
                          ? "1px solid var(--color-interest-border)"
                          : "1px solid transparent",
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={layersOpen}
            onClick={() => setLayersOpen((o) => !o)}
            className="btn-tactile inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium hud-surface"
            style={{
              color: layersOpen
                ? "var(--color-interest)"
                : "var(--color-foreground)",
              borderColor: layersOpen
                ? "var(--color-interest-border)"
                : "var(--hud-card-border)",
            }}
          >
            <Layers className="h-3.5 w-3.5" />
            Camadas
          </button>

          {/* Sliding Emerald Tool Pill (Pin | Mover) */}
          {mode === "author" && (
            <div className="relative inline-flex items-center rounded-full p-0.5 hud-surface">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute left-0.5 top-0.5 h-7 w-7 rounded-full transition-transform duration-200 ease-out"
                style={{
                  backgroundColor: "var(--color-interest)",
                  transform:
                    tool === "pan" ? "translateX(28px)" : "translateX(0px)",
                }}
              />
              <button
                type="button"
                aria-label="Ferramenta Pin"
                title="Pin (V)"
                onClick={() => setTool("pin")}
                className="relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-150"
                style={{
                  color:
                    tool === "pin"
                      ? "var(--color-interest-foreground)"
                      : "var(--color-muted-foreground)",
                }}
              >
                <Crosshair className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Ferramenta Mover"
                title="Mover (H / Espaço)"
                onClick={() => setTool("pan")}
                className="relative z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-colors duration-150"
                style={{
                  color:
                    tool === "pan"
                      ? "var(--color-interest-foreground)"
                      : "var(--color-muted-foreground)",
                }}
              >
                <Hand className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right-Edge Floating Vertical Zoom Bar (always accessible; glides smoothly left when right card expands) */}
      <div
        data-testid="right-zoom-bar"
        onPointerDown={(e) => e.stopPropagation()}
        className="right-edge-shift pointer-events-auto absolute right-4 top-1/2 z-25 flex flex-col overflow-hidden rounded-xl hud-surface"
        style={{
          transform: `translate3d(${-rightInsetPx}px, -50%, 0)`,
        }}
      >
        <button
          type="button"
          aria-label="Aumentar zoom"
          onClick={() => zoomByFactor(1.25)}
          className="btn-tactile flex h-8 w-8 cursor-pointer items-center justify-center hover:opacity-80"
          style={{ color: "var(--color-foreground)" }}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Diminuir zoom"
          onClick={() => zoomByFactor(0.8)}
          className="btn-tactile flex h-8 w-8 cursor-pointer items-center justify-center border-t hover:opacity-80"
          style={{
            color: "var(--color-foreground)",
            borderColor: "var(--color-border)",
          }}
        >
          <Minus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Ajustar à tela"
          title="Ajustar (Ctrl+0)"
          onClick={() => fitToContainer({ animate: true })}
          className="btn-tactile flex h-8 w-8 cursor-pointer items-center justify-center border-t hover:opacity-80"
          style={{
            color: "var(--color-foreground)",
            borderColor: "var(--color-border)",
          }}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <div
          ref={zoomLabelRef}
          className="border-t py-1 text-center font-mono text-[10px]"
          style={{
            color: "var(--color-muted-foreground)",
            borderColor: "var(--color-border)",
          }}
        >
          100%
        </div>
      </div>

      {/* Bottom-Right Retractable Tree Legend (glides smoothly left alongside Zoom bar when right card expands) */}
      {layers.showLegend && legendData.length > 0 && (
        <div
          data-testid="floating-legend"
          onPointerDown={(e) => e.stopPropagation()}
          className="right-edge-shift pointer-events-auto absolute bottom-4 right-4 z-20 max-h-56 w-60 overflow-y-auto rounded-xl p-2 text-xs hud-surface"
          style={{
            transform: `translate3d(${-rightInsetPx}px, 0, 0)`,
          }}
        >
          <div className="flex flex-col gap-0.5">
            {legendData.map((item) => {
              const isActive = activeCategoryFilterId === item.node.id;
              return (
                <div
                  key={item.node.id}
                  className="flex items-center rounded-md transition-colors duration-150"
                  style={{
                    paddingLeft: `${4 + item.depth * 12}px`,
                    backgroundColor: isActive
                      ? "var(--color-interest-soft)"
                      : "transparent",
                  }}
                >
                  {item.hasChildCategories ? (
                    <button
                      type="button"
                      aria-label={
                        item.isExpanded
                          ? `Recolher ${item.node.label}`
                          : `Expandir ${item.node.label}`
                      }
                      onClick={() =>
                        setLegendCollapsedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(item.node.id)) {
                            next.delete(item.node.id);
                          } else {
                            next.add(item.node.id);
                          }
                          return next;
                        })
                      }
                      className="btn-tactile flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded hover:opacity-80"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      <ChevronRight
                        data-open={item.isExpanded ? "true" : "false"}
                        className="chevron-rotate h-3 w-3"
                      />
                    </button>
                  ) : (
                    <span className="w-5 shrink-0" />
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      onToggleCategoryFilter?.(isActive ? null : item.node.id)
                    }
                    className="btn-tactile flex min-w-0 flex-1 cursor-pointer items-center justify-between py-1 pr-2 text-left"
                    style={{
                      color: isActive
                        ? "var(--color-interest)"
                        : "var(--color-foreground)",
                    }}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor: cssVarForToken(
                            item.resolvedColorToken,
                          ),
                          border: "1.5px solid var(--pin-ring-color)",
                        }}
                      />
                      <span className="truncate">{item.node.label}</span>
                    </span>
                    <span
                      className="ml-2 font-mono text-[10px]"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {item.count}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
