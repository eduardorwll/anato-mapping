export interface ViewportState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface Size2D {
  width: number;
  height: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Rect2D {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface PinCropProjection {
  widthPercent: number;
  translateXPercent: number;
  translateYPercent: number;
}

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 8;

export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const clamped = Math.min(100, Math.max(0, value));
  return Number(clamped.toFixed(2));
}

export function clientPointToPercent(
  clientX: number,
  clientY: number,
  imageRect: Rect2D,
): Point2D {
  if (imageRect.width <= 0 || imageRect.height <= 0) {
    return { x: 0, y: 0 };
  }
  const rawX = ((clientX - imageRect.left) / imageRect.width) * 100;
  const rawY = ((clientY - imageRect.top) / imageRect.height) * 100;
  return {
    x: clampPercent(rawX),
    y: clampPercent(rawY),
  };
}

/**
 * Zero-reflow projection: converts a pointer position relative to the canvas
 * container into exact image percentages using viewport + natural image size,
 * avoiding `getBoundingClientRect()` layout thrashing during 120Hz drags.
 */
export function containerPointToPercent(
  containerPoint: Point2D,
  viewport: ViewportState,
  imageSize: Size2D,
): Point2D {
  const renderedW = imageSize.width * viewport.scale;
  const renderedH = imageSize.height * viewport.scale;
  if (renderedW <= 0 || renderedH <= 0) {
    return { x: 0, y: 0 };
  }
  const rawX = ((containerPoint.x - viewport.offsetX) / renderedW) * 100;
  const rawY = ((containerPoint.y - viewport.offsetY) / renderedH) * 100;
  return {
    x: clampPercent(rawX),
    y: clampPercent(rawY),
  };
}

export function percentToClientPoint(
  percent: Point2D,
  imageRect: Rect2D,
): Point2D {
  return {
    x: imageRect.left + (clampPercent(percent.x) / 100) * imageRect.width,
    y: imageRect.top + (clampPercent(percent.y) / 100) * imageRect.height,
  };
}

export function fitImageToViewport(
  imageSize: Size2D,
  containerSize: Size2D,
  padding = 48,
): ViewportState {
  if (
    imageSize.width <= 0 ||
    imageSize.height <= 0 ||
    containerSize.width <= 0 ||
    containerSize.height <= 0
  ) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }
  const availW = Math.max(64, containerSize.width - padding * 2);
  const availH = Math.max(64, containerSize.height - padding * 2);
  const scale = Math.min(
    MAX_ZOOM,
    Math.max(
      MIN_ZOOM,
      Math.min(availW / imageSize.width, availH / imageSize.height),
    ),
  );
  const renderedW = imageSize.width * scale;
  const renderedH = imageSize.height * scale;
  return {
    scale,
    offsetX: (containerSize.width - renderedW) / 2,
    offsetY: (containerSize.height - renderedH) / 2,
  };
}

export function normalizeWheelFactor(
  deltaY: number,
  deltaMode = 0,
): number {
  if (deltaY === 0 || !Number.isFinite(deltaY)) return 1;
  // Convert line (1) or page (2) wheel deltas to approximate pixels.
  const pixelDelta =
    deltaMode === 1 ? deltaY * 32 : deltaMode === 2 ? deltaY * 240 : deltaY;
  // Smooth exponential zoom, clamped per event for consistent trackpad & mouse feel.
  const clamped = Math.max(-180, Math.min(180, pixelDelta));
  return Math.exp(-clamped * 0.0018);
}

export function zoomAtPoint(
  viewport: ViewportState,
  factor: number,
  anchor: Point2D,
  minScale = MIN_ZOOM,
  maxScale = MAX_ZOOM,
): ViewportState {
  const nextScale = Math.min(
    maxScale,
    Math.max(minScale, viewport.scale * factor),
  );
  if (nextScale === viewport.scale) return viewport;

  const worldX = (anchor.x - viewport.offsetX) / viewport.scale;
  const worldY = (anchor.y - viewport.offsetY) / viewport.scale;

  return {
    scale: nextScale,
    offsetX: anchor.x - worldX * nextScale,
    offsetY: anchor.y - worldY * nextScale,
  };
}

export function centerOnPercentPoint(
  percent: Point2D,
  imageSize: Size2D,
  containerSize: Size2D,
  scale: number,
): ViewportState {
  const clampedScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale));
  const worldX = (clampPercent(percent.x) / 100) * imageSize.width;
  const worldY = (clampPercent(percent.y) / 100) * imageSize.height;

  return {
    scale: clampedScale,
    offsetX: containerSize.width / 2 - worldX * clampedScale,
    offsetY: containerSize.height / 2 - worldY * clampedScale,
  };
}

export function computePinCropProjection(
  percent: Point2D,
  zoom = 2.2,
  imageSize?: Size2D,
): PinCropProjection {
  const x = clampPercent(percent.x);
  const y = clampPercent(percent.y);
  const clampedZoom = Math.max(1, Math.min(6, zoom));

  let widthPercent = Math.round(clampedZoom * 100);
  if (imageSize && imageSize.width > 0 && imageSize.height > 0) {
    const aspect = imageSize.width / imageSize.height;
    if (aspect < 1) {
      widthPercent = Math.round(
        Math.max(130, Math.min(clampedZoom * 100, clampedZoom * 100 * Math.sqrt(aspect))),
      );
    }
  }

  return {
    widthPercent,
    translateXPercent: -x,
    translateYPercent: -y,
  };
}
