import { describe, expect, it, vi } from "vitest";
import { createBrowserWorkspaceGateway } from "../browser";
import { createTauriWorkspaceGateway, type TauriBridge } from "../tauri";

describe("workspace-gateway (tauri adapter)", () => {
  it("scans folders, inspects dropped images, reads sibling JSON and writes atomically", async () => {
    const sampleEntry = {
      path: "/lab/umero/umero_anterior.webp",
      fileName: "umero_anterior.webp",
      extension: "webp",
      mimeType: "image/webp",
      jsonPath: "/lab/umero/umero_anterior.json",
      hasJson: true,
      pinCount: 3,
    };

    const invoke = vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
      if (cmd === "scan_folder") return [sampleEntry];
      if (cmd === "inspect_image") return sampleEntry;
      if (cmd === "read_json_file") return '{"schemaVersion":"1.0.0","pins":[]}';
      if (cmd === "write_json_file") return undefined;
      if (cmd === "load_custom_categories") return "[]";
      if (cmd === "save_custom_categories") return undefined;
      throw new Error(`Unexpected command: ${cmd} (${JSON.stringify(args)})`);
    });

    const bridge: TauriBridge = {
      invoke: invoke as unknown as TauriBridge["invoke"],
      open: vi.fn(async () => "/lab/umero") as unknown as TauriBridge["open"],
      save: vi.fn(async () => "/lab/umero/custom.json") as unknown as TauriBridge["save"],
    };

    const gateway = createTauriWorkspaceGateway(bridge);
    const folder = await gateway.pickFolder();
    expect(folder?.folderName).toBe("umero");
    expect(folder?.entries).toHaveLength(1);

    const sibling = await gateway.readSiblingJson(sampleEntry);
    expect(sibling).toContain("schemaVersion");

    const saved = await gateway.saveSiblingJson(sampleEntry, '{"pins":[]}');
    expect(saved.savedFileName).toBe("umero_anterior.json");
    expect(invoke).toHaveBeenCalledWith("write_json_file", {
      filePath: sampleEntry.jsonPath,
      content: '{"pins":[]}',
    });

    expect(await gateway.inspectDroppedPath("/lab/notas.txt")).toBeNull();
    const dropped = await gateway.inspectDroppedPath(sampleEntry.path);
    expect(dropped?.extension).toBe("webp");
  });
});

describe("workspace-gateway (browser adapter)", () => {
  it("accepts multi-format File drops and rejects unsupported files", () => {
    const gateway = createBrowserWorkspaceGateway();
    const png = new File(["bytes"], "radio_anterior.avif", {
      type: "image/avif",
    });
    const txt = new File(["hello"], "README.md", { type: "text/markdown" });

    const entry = gateway.createEntryFromFile(png);
    expect(entry).not.toBeNull();
    expect(entry?.extension).toBe("avif");
    expect(entry?.jsonPath).toBe("radio_anterior.json");

    expect(gateway.createEntryFromFile(txt)).toBeNull();
  });
});
