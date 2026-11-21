import type { CategoryColorToken, CategoryNode } from "./types";

export const SYSTEMS_ROOT_ID = "sistemas";

export const CATEGORY_COLOR_TOKENS: ReadonlyArray<{
  token: CategoryColorToken;
  label: string;
}> = [
  { token: "--pin-cat-sistemas", label: "Menta" },
  { token: "--pin-cat-skeletal", label: "Coral" },
  { token: "--pin-cat-articular", label: "Ciano" },
  { token: "--pin-cat-muscular", label: "Pêssego" },
  { token: "--pin-cat-nervous", label: "Limão" },
  { token: "--pin-cat-cardiovascular", label: "Rosa" },
  { token: "--pin-cat-respiratory", label: "Céu" },
  { token: "--pin-cat-digestive", label: "Damasco" },
  { token: "--pin-cat-urinary", label: "Lima" },
  { token: "--pin-cat-reproductive", label: "Orquídea" },
  { token: "--pin-cat-endocrine", label: "Lavanda" },
  { token: "--pin-cat-lymphatic", label: "Primavera" },
  { token: "--pin-cat-integumentary", label: "Pervinca" },
];

export const BUILT_IN_CATEGORIES: ReadonlyArray<CategoryNode> = [
  {
    id: SYSTEMS_ROOT_ID,
    label: "Sistemas",
    parentId: null,
    colorToken: "--pin-cat-sistemas",
    builtIn: true,
  },
  {
    id: "sistemas.esqueletico",
    label: "Esquelético",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-skeletal",
    builtIn: true,
  },
  {
    id: "sistemas.articular",
    label: "Articular",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-articular",
    builtIn: true,
  },
  {
    id: "sistemas.muscular",
    label: "Muscular",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-muscular",
    builtIn: true,
  },
  {
    id: "sistemas.nervoso",
    label: "Nervoso",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-nervous",
    builtIn: true,
  },
  {
    id: "sistemas.cardiovascular",
    label: "Cardiovascular",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-cardiovascular",
    builtIn: true,
  },
  {
    id: "sistemas.respiratorio",
    label: "Respiratório",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-respiratory",
    builtIn: true,
  },
  {
    id: "sistemas.digestorio",
    label: "Digestório",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-digestive",
    builtIn: true,
  },
  {
    id: "sistemas.urinario",
    label: "Urinário",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-urinary",
    builtIn: true,
  },
  {
    id: "sistemas.reprodutor",
    label: "Reprodutor",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-reproductive",
    builtIn: true,
  },
  {
    id: "sistemas.endocrino",
    label: "Endócrino",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-endocrine",
    builtIn: true,
  },
  {
    id: "sistemas.linfatico",
    label: "Linfático",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-lymphatic",
    builtIn: true,
  },
  {
    id: "sistemas.tegumentar",
    label: "Tegumentar",
    parentId: SYSTEMS_ROOT_ID,
    colorToken: "--pin-cat-integumentary",
    builtIn: true,
  },
];

const VALID_TOKENS = new Set<string>(CATEGORY_COLOR_TOKENS.map((t) => t.token));

export function isValidCategoryColorToken(
  value: unknown,
): value is CategoryColorToken {
  return typeof value === "string" && VALID_TOKENS.has(value);
}

export function createDefaultCategoryTree(): CategoryNode[] {
  return BUILT_IN_CATEGORIES.map((node) => ({ ...node }));
}
