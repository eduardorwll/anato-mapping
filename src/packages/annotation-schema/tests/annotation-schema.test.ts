import { describe, expect, it } from "vitest";
import {
  addCategory,
  createDefaultCategoryTree,
} from "../../category-tree/index";
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  deriveJsonFileName,
  getFormatBadge,
  getMimeTypeForFile,
  isSupportedImageFile,
} from "../formats";
import {
  SCHEMA_VERSION,
  createEmptyDocument,
  createPin,
  parseAndNormalizeDocument,
  serializeDocument,
} from "../index";

describe("annotation-schema formats", () => {
  it("supports all 8 canonical image formats and rejects non-images", () => {
    expect(SUPPORTED_IMAGE_EXTENSIONS).toEqual([
      "png",
      "jpg",
      "jpeg",
      "webp",
      "avif",
      "bmp",
      "gif",
      "svg",
    ]);

    for (const ext of SUPPORTED_IMAGE_EXTENSIONS) {
      expect(isSupportedImageFile(`Úmero_Anterior.${ext}`)).toBe(true);
      expect(isSupportedImageFile(`UMERO.${ext.toUpperCase()}`)).toBe(true);
    }

    expect(isSupportedImageFile("notas.txt")).toBe(false);
    expect(isSupportedImageFile("umero.json")).toBe(false);
    expect(getMimeTypeForFile("peca.webp")).toBe("image/webp");
    expect(getMimeTypeForFile("diagrama.svg")).toBe("image/svg+xml");
    expect(getFormatBadge("foto.jpeg")).toBe("JPG");
  });

  it("derives OS-safe sibling json filenames without leaking directory paths", () => {
    expect(deriveJsonFileName("C:\\Users\\Carol\\Úmero Anterior.webp")).toBe(
      "Úmero Anterior.json",
    );
    expect(deriveJsonFileName("/home/eduardo/ossos/radio:distal?.png")).toBe(
      "radio_distal_.json",
    );
  });
});

describe("annotation-schema codec", () => {
  it("round-trips AnnotationDocumentV1 with embedded custom categories and basename-only fileName", () => {
    const baseTree = createDefaultCategoryTree();
    const { nodes: tree, created: sub } = addCategory(baseTree, {
      label: "Acidentes Ósseos",
      parentId: "sistemas.esqueletico",
      colorToken: "--pin-cat-nervous",
    });

    const doc = createEmptyDocument({
      fileName: "C:\\Drive\\Anatomia\\umero_anterior.webp",
      mimeType: "image/webp",
      width: 2400,
      height: 3200,
    });
    doc.metadata.region = "Membro Superior";
    doc.metadata.structure = "Úmero";
    doc.metadata.view = "Anterior";
    doc.metadata.bibliography = "MOORE, 8ª ed.";
    doc.pins.push(
      createPin({
        x: 46.824,
        y: 18.451,
        name: "Sulco intertubercular",
        description: "Passagem do tendão do bíceps.",
        categoryId: sub.id,
        tags: ["ombro", "tendão"],
      }),
    );

    const json = serializeDocument(doc, tree);
    expect(json.includes("\r\n")).toBe(false);
    expect(json.endsWith("\n")).toBe(true);

    const parsed = parseAndNormalizeDocument(json);
    expect(parsed.warnings).toHaveLength(0);
    expect(parsed.document.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.document.image.fileName).toBe("umero_anterior.webp");
    expect(parsed.document.pins[0]).toMatchObject({
      name: "Sulco intertubercular",
      x: 46.82,
      y: 18.45,
      categoryId: sub.id,
    });
    expect(parsed.importedCategories.map((c) => c.label)).toEqual([
      "Acidentes Ósseos",
    ]);
  });

  it("tolerantly upgrades minimal Portuguese legacy prototype JSON", () => {
    const legacy = JSON.stringify([
      { nome: "Cabeça do úmero", descricao: "Articula com a glenoide", x: 52.3, y: 12.7 },
    ]);
    const parsed = parseAndNormalizeDocument(legacy, {
      fileName: "umero.jpg",
      mimeType: "image/jpeg",
      width: 1200,
      height: 1600,
    });

    expect(parsed.warnings.length).toBeGreaterThan(0);
    expect(parsed.document.image.fileName).toBe("umero.jpg");
    expect(parsed.document.pins[0]).toMatchObject({
      name: "Cabeça do úmero",
      description: "Articula com a glenoide",
      x: 52.3,
      y: 12.7,
    });
  });
});
