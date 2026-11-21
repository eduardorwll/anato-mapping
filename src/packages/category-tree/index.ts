export type {
  CategoryColorToken,
  CategoryNode,
  CreateCategoryInput,
  FlattenedCategoryItem,
  UpdateCategoryInput,
} from "./lib/types";
export {
  BUILT_IN_CATEGORIES,
  CATEGORY_COLOR_TOKENS,
  SYSTEMS_ROOT_ID,
  createDefaultCategoryTree,
  isValidCategoryColorToken,
} from "./lib/defaults";
export {
  addCategory,
  collectAutoExpandedIds,
  extractCustomCategoriesForPins,
  flattenTreeForDisplay,
  getAncestorChain,
  getCategoryById,
  getChildren,
  getCollapsibleTreeItems,
  getDescendantIds,
  isHiddenByAncestors,
  matchesCategoryFilter,
  mergeCategories,
  removeCategory,
  resolveCategoryColorToken,
  updateCategory,
} from "./lib/tree";
export type { CollapsibleTreeItem } from "./lib/tree";
