import { describe, expect, it } from "vitest";
import {
  MAX_ZOOM,
  MIN_ZOOM,
  centerOnPercentPoint,
  clientPointToPercent,
  computePinCropProjection,
  containerPointToPercent,
  fitImageToViewport,
  normalizeWheelFactor,
  percentToClientPoint,
  zoomAtPoint,
} from "../index";

describe("viewport-math", () => {
  it("projects client coordinates to percentage and back accurately", () => {
    const rect = { left: 120, top: 80, width: 1600, height: 2400 };
    const percent = clientPointToPercent(869.12, 522.8, rect);
    expect(percent).toEqual({ x: 46.82, y: 18.45 });

    const roundTrip = percentToClientPoint(percent, rect);
    expect(roundTrip.x).toBeCloseTo(869.12, 1);
    expect(roundTrip.y).toBeCloseTo(522.8, 1);
  });

  it("clamps coordinates outside image bounds to [0, 100]", () => {
    const rect = { left: 100, top: 50, width: 500, height: 500 };
    expect(clientPointToPercent(20, -10, rect)).toEqual({ x: 0, y: 0 });
    expect(clientPointToPercent(999, 888, rect)).toEqual({ x: 100, y: 100 });
  });

  it("keeps cursor anchor stationary during zoomAtPoint", () => {
    const initial = { scale: 1, offsetX: 100, offsetY: 50 };
    const anchor = { x: 420, y: 310 };
    const worldBeforeX = (anchor.x - initial.offsetX) / initial.scale;
    const worldBeforeY = (anchor.y - initial.offsetY) / initial.scale;

    const zoomed = zoomAtPoint(initial, 2.5, anchor);
    const worldAfterX = (anchor.x - zoomed.offsetX) / zoomed.scale;
    const worldAfterY = (anchor.y - zoomed.offsetY) / zoomed.scale;

    expect(worldAfterX).toBeCloseTo(worldBeforeX, 6);
    expect(worldAfterY).toBeCloseTo(worldBeforeY, 6);
  });

  it("clamps zoom to MIN_ZOOM and MAX_ZOOM", () => {
    const base = { scale: 1, offsetX: 0, offsetY: 0 };
    expect(zoomAtPoint(base, 0.01, { x: 0, y: 0 }).scale).toBe(MIN_ZOOM);
    expect(zoomAtPoint(base, 50, { x: 0, y: 0 }).scale).toBe(MAX_ZOOM);
  });

  it("fits portrait and landscape images centered inside container", () => {
    const portrait = fitImageToViewport(
      { width: 2000, height: 4000 },
      { width: 1200, height: 800 },
      40,
    );
    expect(portrait.scale).toBeCloseTo(720 / 4000, 4);
    expect(portrait.offsetY).toBeCloseTo(40, 4);
    expect(portrait.offsetX).toBeGreaterThan(400);
  });

  it("centers a target percentage point in the container", () => {
    const vp = centerOnPercentPoint(
      { x: 50, y: 25 },
      { width: 1000, height: 2000 },
      { width: 800, height: 600 },
      2,
    );
    expect(vp.offsetX).toBe(800 / 2 - 500 * 2);
    expect(vp.offsetY).toBe(600 / 2 - 500 * 2);
  });

  it("computes exact center-locked crop projection for portrait and landscape images", () => {
    const landscape = computePinCropProjection(
      { x: 30, y: 75 },
      2.2,
      { width: 1600, height: 900 },
    );
    expect(landscape).toEqual({
      widthPercent: 220,
      translateXPercent: -30,
      translateYPercent: -75,
    });

    const portrait = computePinCropProjection(
      { x: 54.14, y: 38.57 },
      2.2,
      { width: 1080, height: 1350 },
    );
    expect(portrait.translateXPercent).toBe(-54.14);
    expect(portrait.translateYPercent).toBe(-38.57);
    expect(portrait.widthPercent).toBeGreaterThanOrEqual(130);
    expect(portrait.widthPercent).toBeLessThanOrEqual(220);
  });

  it("projects container pointer position to exact image percentage without DOM reads", () => {
    const viewport = { scale: 2, offsetX: 100, offsetY: -40 };
    const imageSize = { width: 1000, height: 500 };
    // Rendered rect is left=100, top=-40, width=2000, height=1000
    const percent = containerPointToPercent(
      { x: 1100, y: 210 },
      viewport,
      imageSize,
    );
    expect(percent).toEqual({ x: 50, y: 25 });
  });

  it("normalizes smooth wheel zoom factors for trackpads and notched wheels", () => {
    expect(normalizeWheelFactor(0)).toBe(1);
    expect(normalizeWheelFactor(-100, 0)).toBeGreaterThan(1);
    expect(normalizeWheelFactor(100, 0)).toBeLessThan(1);
    expect(normalizeWheelFactor(-3, 1)).toBeGreaterThan(1);
  });
});
