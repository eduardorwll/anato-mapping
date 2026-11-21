import {
  IMAGE_ACCEPT_ATTRIBUTE,
  deriveJsonFileName,
  getImageExtension,
  getMimeTypeForFile,
  isSupportedImageFile,
} from "../../annotation-schema/formats";
import type { CategoryNode } from "../../category-tree/index";
import type {
  FolderSelection,
  LoadedImageResource,
  WorkspaceGateway,
  WorkspaceImageEntry,
} from "./types";

const CATEGORIES_STORAGE_KEY = "anato-mapping.custom-categories";

function triggerDownload(fileName: string, content: string): void {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function openFileInput(options: {
  accept?: string;
  directory?: boolean;
}): Promise<FileList | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    if (options.accept) input.accept = options.accept;
    if (options.directory) {
      input.setAttribute("webkitdirectory", "");
      input.setAttribute("directory", "");
      input.multiple = true;
    }
    input.onchange = () => resolve(input.files);
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function quickCountPins(raw: string): number {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.length;
    if (parsed && typeof parsed === "object") {
      const rec = parsed as Record<string, unknown>;
      for (const k of ["pins", "points", "estruturas"]) {
        if (Array.isArray(rec[k])) return (rec[k] as unknown[]).length;
      }
    }
  } catch {
    // Ignore malformed JSON during quick scan.
  }
  return 0;
}

export function createBrowserWorkspaceGateway(): WorkspaceGateway {
  const memorySavedJson = new Map<string, string>();

  return {
    runtime: "browser",

    async pickFolder(): Promise<FolderSelection | null> {
      const files = await openFileInput({ directory: true });
      if (!files || files.length === 0) return null;

      const allFiles = Array.from(files);
      const jsonByName = new Map<string, File>();
      for (const f of allFiles) {
        if (f.name.toLowerCase().endsWith(".json")) {
          jsonByName.set(f.name.toLowerCase(), f);
        }
      }

      const imageFiles = allFiles
        .filter((f) => isSupportedImageFile(f.name))
        .sort((a, b) =>
          a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        );

      const entries: WorkspaceImageEntry[] = [];
      for (const f of imageFiles) {
        const ext = getImageExtension(f.name) ?? "png";
        const jsonName = deriveJsonFileName(f.name);
        const siblingJson = jsonByName.get(jsonName.toLowerCase());
        let pinCount = 0;
        if (siblingJson) {
          pinCount = quickCountPins(await siblingJson.text());
        }
        entries.push({
          path: f.webkitRelativePath || f.name,
          fileName: f.name,
          extension: ext,
          mimeType: f.type || getMimeTypeForFile(f.name),
          jsonPath: jsonName,
          hasJson: Boolean(siblingJson),
          pinCount,
          browserFile: f,
          browserJsonFile: siblingJson,
        });
      }

      const firstRel = allFiles[0]?.webkitRelativePath || "";
      const folderName = firstRel.split("/")[0] || "Pasta";
      return {
        folderName,
        folderPath: folderName,
        entries,
      };
    },

    async pickSingleImage(): Promise<WorkspaceImageEntry | null> {
      const files = await openFileInput({ accept: IMAGE_ACCEPT_ATTRIBUTE });
      const file = files?.[0];
      if (!file) return null;
      return this.createEntryFromFile(file);
    },

    async inspectDroppedPath(): Promise<WorkspaceImageEntry | null> {
      return null;
    },

    createEntryFromFile(file: File): WorkspaceImageEntry | null {
      const ext = getImageExtension(file.name);
      if (!ext) return null;
      const jsonFileName = deriveJsonFileName(file.name);
      return {
        path: file.name,
        fileName: file.name,
        extension: ext,
        mimeType: file.type || getMimeTypeForFile(file.name),
        jsonPath: jsonFileName,
        hasJson: memorySavedJson.has(jsonFileName),
        pinCount: 0,
        browserFile: file,
      };
    },

    async loadImageUrl(
      entry: WorkspaceImageEntry,
    ): Promise<LoadedImageResource> {
      if (!entry.browserFile) {
        throw new Error("Arquivo de imagem indisponível.");
      }
      const url = URL.createObjectURL(entry.browserFile);
      return { url, revoke: () => URL.revokeObjectURL(url) };
    },

    async readSiblingJson(entry: WorkspaceImageEntry): Promise<string | null> {
      if (memorySavedJson.has(entry.jsonPath)) {
        return memorySavedJson.get(entry.jsonPath) ?? null;
      }
      if (entry.browserJsonFile) {
        return entry.browserJsonFile.text();
      }
      return null;
    },

    async saveSiblingJson(
      entry: WorkspaceImageEntry,
      jsonContent: string,
    ): Promise<{ savedFileName: string }> {
      const fileName = deriveJsonFileName(entry.fileName);
      memorySavedJson.set(entry.jsonPath, jsonContent);
      triggerDownload(fileName, jsonContent);
      return { savedFileName: fileName };
    },

    async saveJsonAs(
      suggestedFileName: string,
      jsonContent: string,
    ): Promise<{ savedFileName: string } | null> {
      triggerDownload(suggestedFileName, jsonContent);
      return { savedFileName: suggestedFileName };
    },

    async importJsonFile(): Promise<{
      fileName: string;
      content: string;
    } | null> {
      const files = await openFileInput({ accept: ".json,application/json" });
      const file = files?.[0];
      if (!file) return null;
      return {
        fileName: file.name,
        content: await file.text(),
      };
    },

    async loadCustomCategories(): Promise<CategoryNode[]> {
      try {
        const raw = window.localStorage.getItem(CATEGORIES_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as CategoryNode[]) : [];
      } catch {
        return [];
      }
    },

    async saveCustomCategories(customNodes: CategoryNode[]): Promise<void> {
      try {
        window.localStorage.setItem(
          CATEGORIES_STORAGE_KEY,
          JSON.stringify(customNodes),
        );
      } catch {
        // Ignore storage write errors.
      }
    },
  };
}
