export type CategoryColorToken =
  | "--pin-cat-sistemas"
  | "--pin-cat-skeletal"
  | "--pin-cat-articular"
  | "--pin-cat-muscular"
  | "--pin-cat-nervous"
  | "--pin-cat-cardiovascular"
  | "--pin-cat-respiratory"
  | "--pin-cat-digestive"
  | "--pin-cat-urinary"
  | "--pin-cat-reproductive"
  | "--pin-cat-endocrine"
  | "--pin-cat-lymphatic"
  | "--pin-cat-integumentary";

export interface CategoryNode {
  id: string;
  label: string;
  parentId: string | null;
  colorToken: CategoryColorToken | null;
  builtIn: boolean;
}

export interface CreateCategoryInput {
  label: string;
  parentId: string | null;
  colorToken?: CategoryColorToken | null;
}

export interface UpdateCategoryInput {
  label?: string;
  parentId?: string | null;
  colorToken?: CategoryColorToken | null;
}

export interface FlattenedCategoryItem {
  node: CategoryNode;
  depth: number;
  resolvedColorToken: CategoryColorToken;
  pathLabels: string[];
}
