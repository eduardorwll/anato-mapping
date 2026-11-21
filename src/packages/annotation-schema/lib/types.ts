import type { CategoryNode } from "../../category-tree/index";

export const SCHEMA_VERSION = "1.0.0" as const;

export interface SpecimenImageInfo {
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
}

export interface AnatomicalTaxonomy {
  system: string;
  region: string;
  structure: string;
  view: string;
  bibliography: string;
  author: string;
}

export interface Pin {
  id: string;
  name: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  bibliography: string;
  x: number;
  y: number;
}

export interface AnnotationDocumentV1 {
  schemaVersion: typeof SCHEMA_VERSION;
  updatedAt: string;
  image: SpecimenImageInfo;
  metadata: AnatomicalTaxonomy;
  categories: CategoryNode[];
  pins: Pin[];
}

export interface CreatePinInput {
  x: number;
  y: number;
  name?: string;
  description?: string;
  categoryId?: string | null;
  tags?: string[];
  bibliography?: string;
}

export interface ParseDocumentResult {
  document: AnnotationDocumentV1;
  importedCategories: CategoryNode[];
  warnings: string[];
}
