import type { Pin } from "../../annotation-schema/index";
import type { CategoryNode } from "../../category-tree/index";
import type { Point2D, Size2D } from "../../viewport-math/index";

export type CanvasMode = "author" | "visualize";
export type CanvasBackdrop = "theme" | "dark" | "checker" | "light";

export interface CanvasLayerState {
  showLabels: boolean;
  showNumbers: boolean;
  showLegend: boolean;
  backdrop: CanvasBackdrop;
}

export interface CanvasFocusRequest {
  pinId: string;
  nonce: number;
}

export interface AtlasCanvasProps {
  imageUrl: string;
  imageAlt: string;
  pins: ReadonlyArray<Pin>;
  visiblePinIds: ReadonlySet<string>;
  categories: ReadonlyArray<CategoryNode>;
  mode: CanvasMode;
  selectedPinId: string | null;
  activeCategoryFilterId: string | null;
  focusRequest: CanvasFocusRequest | null;
  /** Horizontal offset in px applied via GPU transform to right-edge controls when a right floating panel is open. */
  rightInsetPx?: number;
  onImageNaturalSize?: (size: Size2D) => void;
  onSelectPin: (pinId: string | null) => void;
  onCreatePin?: (percent: Point2D) => void;
  onMovePin?: (pinId: string, percent: Point2D) => void;
  onToggleCategoryFilter?: (categoryId: string | null) => void;
}
