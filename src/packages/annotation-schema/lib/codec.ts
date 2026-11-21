import {
  type CategoryNode,
  extractCustomCategoriesForPins,
} from "../../category-tree/index";
import { extractBaseName, getMimeTypeForFile } from "./formats";
import {
  type AnatomicalTaxonomy,
  type AnnotationDocumentV1,
  type CreatePinInput,
  type ParseDocumentResult,
  type Pin,
  SCHEMA_VERSION,
  type SpecimenImageInfo,
} from "./types";

function clampPercent(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Number(Math.min(100, Math.max(0, num)).toFixed(2));
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function createEmptyTaxonomy(
  overrides?: Partial<AnatomicalTaxonomy>,
): AnatomicalTaxonomy {
  return {
    system: overrides?.system ?? "Sistema Esquelético",
    region: overrides?.region ?? "",
    structure: overrides?.structure ?? "",
    view: overrides?.view ?? "",
    bibliography: overrides?.bibliography ?? "",
    author: overrides?.author ?? "",
  };
}

export function createEmptyDocument(
  image: SpecimenImageInfo,
  taxonomyOverrides?: Partial<AnatomicalTaxonomy>,
): AnnotationDocumentV1 {
  const fileName = extractBaseName(image.fileName);
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    image: {
      fileName,
      mimeType: image.mimeType || getMimeTypeForFile(fileName),
      width: Math.max(0, Math.round(image.width || 0)),
      height: Math.max(0, Math.round(image.height || 0)),
    },
    metadata: createEmptyTaxonomy(taxonomyOverrides),
    categories: [],
    pins: [],
  };
}

export function createPin(
  input: CreatePinInput,
  existingPins: ReadonlyArray<Pin> = [],
): Pin {
  const existingIds = new Set(existingPins.map((p) => p.id));
  let idx = existingPins.length + 1;
  while (existingIds.has(`pin-${idx}`)) {
    idx += 1;
  }
  return {
    id: `pin-${idx}`,
    name: input.name?.trim() ?? "",
    description: input.description ?? "",
    categoryId: input.categoryId ?? "sistemas.esqueletico",
    tags: input.tags ? [...input.tags] : [],
    bibliography: input.bibliography ?? "",
    x: clampPercent(input.x),
    y: clampPercent(input.y),
  };
}

export function serializeDocument(
  doc: AnnotationDocumentV1,
  categoryTree: ReadonlyArray<CategoryNode>,
): string {
  const fileName = extractBaseName(doc.image.fileName);
  const normalizedPins: Pin[] = doc.pins.map((pin, index) => ({
    id: pin.id.trim() || `pin-${index + 1}`,
    name: pin.name.trim(),
    description: pin.description.trim(),
    categoryId: pin.categoryId || null,
    tags: pin.tags.map((t) => t.trim()).filter(Boolean),
    bibliography: pin.bibliography.trim(),
    x: clampPercent(pin.x),
    y: clampPercent(pin.y),
  }));

  const embeddedCategories = extractCustomCategoriesForPins(
    categoryTree,
    normalizedPins.map((p) => p.categoryId),
  );

  const payload: AnnotationDocumentV1 = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    image: {
      fileName,
      mimeType: doc.image.mimeType || getMimeTypeForFile(fileName),
      width: Math.max(0, Math.round(doc.image.width || 0)),
      height: Math.max(0, Math.round(doc.image.height || 0)),
    },
    metadata: {
      system: doc.metadata.system.trim(),
      region: doc.metadata.region.trim(),
      structure: doc.metadata.structure.trim(),
      view: doc.metadata.view.trim(),
      bibliography: doc.metadata.bibliography.trim(),
      author: doc.metadata.author.trim(),
    },
    categories: embeddedCategories,
    pins: normalizedPins,
  };

  return `${JSON.stringify(payload, null, 2).replace(/\r\n/g, "\n")}\n`;
}

function normalizePin(raw: unknown, index: number): Pin | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const rawX = rec.x ?? rec.posX ?? rec.left;
  const rawY = rec.y ?? rec.posY ?? rec.top;
  if (rawX === undefined || rawY === undefined) return null;

  const id = asString(rec.id).trim() || `pin-${index + 1}`;
  const name = asString(rec.name ?? rec.nome ?? rec.label ?? rec.title);
  const description = asString(rec.description ?? rec.descricao ?? rec.desc);
  const bibliography = asString(
    rec.bibliography ?? rec.bibliografia ?? rec.source ?? rec.fonte,
  );
  const rawCat = rec.categoryId ?? rec.category ?? rec.categoria;
  const categoryId =
    typeof rawCat === "string" && rawCat.trim() ? rawCat.trim() : null;

  return {
    id,
    name,
    description,
    categoryId,
    tags: asStringArray(rec.tags),
    bibliography,
    x: clampPercent(rawX),
    y: clampPercent(rawY),
  };
}

export function parseAndNormalizeDocument(
  rawJson: string,
  fallbackImage?: SpecimenImageInfo,
): ParseDocumentResult {
  const warnings: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error("Arquivo JSON inválido.");
  }

  let rawPins: unknown[] = [];
  let rawImage: Record<string, unknown> = {};
  let rawMeta: Record<string, unknown> = {};
  let rawCategories: unknown[] = [];
  let updatedAt = new Date().toISOString();

  if (Array.isArray(parsed)) {
    rawPins = parsed;
    warnings.push("Formato legado (lista simples) convertido para v1.0.0.");
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    if (obj.schemaVersion !== SCHEMA_VERSION) {
      warnings.push("Documento sem schemaVersion v1.0.0 normalizado.");
    }
    if (Array.isArray(obj.pins)) {
      rawPins = obj.pins;
    } else if (Array.isArray(obj.points)) {
      rawPins = obj.points;
    } else if (Array.isArray(obj.estruturas)) {
      rawPins = obj.estruturas;
    }
    if (obj.image && typeof obj.image === "object") {
      rawImage = obj.image as Record<string, unknown>;
    }
    if (obj.metadata && typeof obj.metadata === "object") {
      rawMeta = obj.metadata as Record<string, unknown>;
    }
    if (Array.isArray(obj.categories)) {
      rawCategories = obj.categories;
    }
    if (typeof obj.updatedAt === "string" && obj.updatedAt.trim()) {
      updatedAt = obj.updatedAt;
    }
  } else {
    throw new Error("Estrutura JSON não suportada.");
  }

  const fileName = extractBaseName(
    asString(rawImage.fileName) || fallbackImage?.fileName || "imagem.png",
  );
  const image: SpecimenImageInfo = {
    fileName,
    mimeType:
      asString(rawImage.mimeType) ||
      fallbackImage?.mimeType ||
      getMimeTypeForFile(fileName),
    width:
      typeof rawImage.width === "number" && rawImage.width > 0
        ? Math.round(rawImage.width)
        : (fallbackImage?.width ?? 0),
    height:
      typeof rawImage.height === "number" && rawImage.height > 0
        ? Math.round(rawImage.height)
        : (fallbackImage?.height ?? 0),
  };

  const metadata = createEmptyTaxonomy({
    system: asString(rawMeta.system ?? rawMeta.sistema, "Sistema Esquelético"),
    region: asString(rawMeta.region ?? rawMeta.regiao),
    structure: asString(rawMeta.structure ?? rawMeta.estrutura ?? rawMeta.osso),
    view: asString(rawMeta.view ?? rawMeta.vista),
    bibliography: asString(rawMeta.bibliography ?? rawMeta.bibliografia),
    author: asString(rawMeta.author ?? rawMeta.autor),
  });

  const pins: Pin[] = [];
  rawPins.forEach((item, index) => {
    const normalized = normalizePin(item, index);
    if (normalized) {
      pins.push(normalized);
    } else {
      warnings.push(`Pin #${index + 1} ignorado por coordenadas inválidas.`);
    }
  });

  const importedCategories = rawCategories.filter(
    (c): c is CategoryNode =>
      Boolean(c) &&
      typeof c === "object" &&
      typeof (c as CategoryNode).id === "string" &&
      typeof (c as CategoryNode).label === "string",
  );

  return {
    document: {
      schemaVersion: SCHEMA_VERSION,
      updatedAt,
      image,
      metadata,
      categories: importedCategories,
      pins,
    },
    importedCategories,
    warnings,
  };
}
