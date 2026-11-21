import type { CategoryNode } from "../../category-tree/index";

export interface WorkspaceImageEntry {
  path: string;
  fileName: string;
  extension: string;
  mimeType: string;
  jsonPath: string;
  hasJson: boolean;
  pinCount: number;
  /** Present only when loaded from a browser File input / drag-drop */
  browserFile?: File;
  /** Present only when a sibling JSON File was selected in browser folder mode */
  browserJsonFile?: File;
}

export interface FolderSelection {
  folderName: string;
  folderPath: string;
  entries: WorkspaceImageEntry[];
}

export interface LoadedImageResource {
  url: string;
  revoke: () => void;
}

export interface WorkspaceGateway {
  readonly runtime: "tauri" | "browser";
  pickFolder(): Promise<FolderSelection | null>;
  pickSingleImage(): Promise<WorkspaceImageEntry | null>;
  inspectDroppedPath(filePath: string): Promise<WorkspaceImageEntry | null>;
  createEntryFromFile(file: File): WorkspaceImageEntry | null;
  loadImageUrl(entry: WorkspaceImageEntry): Promise<LoadedImageResource>;
  readSiblingJson(entry: WorkspaceImageEntry): Promise<string | null>;
  saveSiblingJson(
    entry: WorkspaceImageEntry,
    jsonContent: string,
  ): Promise<{ savedFileName: string }>;
  saveJsonAs(
    suggestedFileName: string,
    jsonContent: string,
  ): Promise<{ savedFileName: string } | null>;
  importJsonFile(): Promise<{ fileName: string; content: string } | null>;
  loadCustomCategories(): Promise<CategoryNode[]>;
  saveCustomCategories(customNodes: CategoryNode[]): Promise<void>;
}
