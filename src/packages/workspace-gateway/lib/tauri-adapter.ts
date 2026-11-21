import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  deriveJsonFileName,
  extractBaseName,
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

export interface TauriBridge {
  invoke: typeof invoke;
  open: typeof open;
  save: typeof save;
}

const DEFAULT_BRIDGE: TauriBridge = { invoke, open, save };

function folderLabelFromPath(path: string): string {
  const cleaned = path.replace(/[\\/]+$/, "");
  return extractBaseName(cleaned) || cleaned;
}

export function createTauriWorkspaceGateway(
  bridge: TauriBridge = DEFAULT_BRIDGE,
): WorkspaceGateway {
  return {
    runtime: "tauri",

    async pickFolder(): Promise<FolderSelection | null> {
      const selected = await bridge.open({
        directory: true,
        multiple: false,
        title: "Abrir Pasta",
      });
      if (!selected || Array.isArray(selected)) return null;
      const entries = await bridge.invoke<WorkspaceImageEntry[]>(
        "scan_folder",
        { dirPath: selected },
      );
      return {
        folderName: folderLabelFromPath(selected),
        folderPath: selected,
        entries,
      };
    },

    async pickSingleImage(): Promise<WorkspaceImageEntry | null> {
      const selected = await bridge.open({
        directory: false,
        multiple: false,
        title: "Abrir Imagem",
        filters: [
          {
            name: "Imagens",
            extensions: [...SUPPORTED_IMAGE_EXTENSIONS],
          },
        ],
      });
      if (!selected || Array.isArray(selected)) return null;
      return bridge.invoke<WorkspaceImageEntry>("inspect_image", {
        filePath: selected,
      });
    },

    async inspectDroppedPath(
      filePath: string,
    ): Promise<WorkspaceImageEntry | null> {
      if (!isSupportedImageFile(filePath)) return null;
      return bridge.invoke<WorkspaceImageEntry>("inspect_image", {
        filePath,
      });
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
        hasJson: false,
        pinCount: 0,
        browserFile: file,
      };
    },

    async loadImageUrl(
      entry: WorkspaceImageEntry,
    ): Promise<LoadedImageResource> {
      if (entry.browserFile) {
        const url = URL.createObjectURL(entry.browserFile);
        return { url, revoke: () => URL.revokeObjectURL(url) };
      }
      const rawBytes = await bridge.invoke<ArrayBuffer>("read_image_bytes", {
        filePath: entry.path,
      });
      const blob = new Blob([rawBytes], { type: entry.mimeType });
      const url = URL.createObjectURL(blob);
      return { url, revoke: () => URL.revokeObjectURL(url) };
    },

    async readSiblingJson(entry: WorkspaceImageEntry): Promise<string | null> {
      if (!entry.hasJson) return null;
      try {
        return await bridge.invoke<string>("read_json_file", {
          filePath: entry.jsonPath,
        });
      } catch {
        return null;
      }
    },

    async saveSiblingJson(
      entry: WorkspaceImageEntry,
      jsonContent: string,
    ): Promise<{ savedFileName: string }> {
      await bridge.invoke("write_json_file", {
        filePath: entry.jsonPath,
        content: jsonContent,
      });
      return { savedFileName: extractBaseName(entry.jsonPath) };
    },

    async saveJsonAs(
      suggestedFileName: string,
      jsonContent: string,
    ): Promise<{ savedFileName: string } | null> {
      const target = await bridge.save({
        title: "Salvar JSON",
        defaultPath: suggestedFileName,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!target) return null;
      await bridge.invoke("write_json_file", {
        filePath: target,
        content: jsonContent,
      });
      return { savedFileName: extractBaseName(target) };
    },

    async importJsonFile(): Promise<{
      fileName: string;
      content: string;
    } | null> {
      const selected = await bridge.open({
        directory: false,
        multiple: false,
        title: "Importar JSON",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!selected || Array.isArray(selected)) return null;
      const content = await bridge.invoke<string>("read_json_file", {
        filePath: selected,
      });
      return {
        fileName: extractBaseName(selected),
        content,
      };
    },

    async loadCustomCategories(): Promise<CategoryNode[]> {
      try {
        const raw = await bridge.invoke<string | null>(
          "load_custom_categories",
        );
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as CategoryNode[]) : [];
      } catch {
        return [];
      }
    },

    async saveCustomCategories(customNodes: CategoryNode[]): Promise<void> {
      const payload = `${JSON.stringify(customNodes, null, 2)}\n`;
      await bridge.invoke("save_custom_categories", { content: payload });
    },
  };
}
