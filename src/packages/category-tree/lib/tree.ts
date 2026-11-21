import {
  BUILT_IN_CATEGORIES,
  createDefaultCategoryTree,
  isValidCategoryColorToken,
} from "./defaults";
import type {
  CategoryColorToken,
  CategoryNode,
  CreateCategoryInput,
  FlattenedCategoryItem,
  UpdateCategoryInput,
} from "./types";

const FALLBACK_COLOR: CategoryColorToken = "--pin-cat-sistemas";

function slugify(input: string): string {
  return (
    input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "categoria"
  );
}

function buildUniqueId(
  nodes: ReadonlyArray<CategoryNode>,
  parentId: string | null,
  label: string,
): string {
  const existing = new Set(nodes.map((n) => n.id));
  const slug = slugify(label);
  const base = parentId ? `${parentId}.${slug}` : `custom.${slug}`;
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

export function getCategoryById(
  nodes: ReadonlyArray<CategoryNode>,
  id: string | null | undefined,
): CategoryNode | undefined {
  if (!id) return undefined;
  return nodes.find((node) => node.id === id);
}

export function getChildren(
  nodes: ReadonlyArray<CategoryNode>,
  parentId: string | null,
): CategoryNode[] {
  return nodes.filter((node) => node.parentId === parentId);
}

export function getAncestorChain(
  nodes: ReadonlyArray<CategoryNode>,
  id: string | null | undefined,
): CategoryNode[] {
  if (!id) return [];
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const chain: CategoryNode[] = [];
  const visited = new Set<string>();
  let current = byId.get(id);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain;
}

export function getDescendantIds(
  nodes: ReadonlyArray<CategoryNode>,
  rootId: string,
): Set<string> {
  const result = new Set<string>([rootId]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    for (const node of nodes) {
      if (node.parentId && result.has(node.parentId) && !result.has(node.id)) {
        result.add(node.id);
        expanded = true;
      }
    }
  }
  return result;
}

export function matchesCategoryFilter(
  nodes: ReadonlyArray<CategoryNode>,
  pinCategoryId: string | null | undefined,
  filterCategoryId: string | null | undefined,
): boolean {
  if (!filterCategoryId) return true;
  if (!pinCategoryId) return false;
  return getDescendantIds(nodes, filterCategoryId).has(pinCategoryId);
}

export function resolveCategoryColorToken(
  nodes: ReadonlyArray<CategoryNode>,
  id: string | null | undefined,
): CategoryColorToken {
  const chain = getAncestorChain(nodes, id);
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const token = chain[i].colorToken;
    if (token) return token;
  }
  return FALLBACK_COLOR;
}

export function addCategory(
  nodes: ReadonlyArray<CategoryNode>,
  input: CreateCategoryInput,
): { nodes: CategoryNode[]; created: CategoryNode } {
  const label = input.label.trim();
  if (!label) {
    throw new Error("O nome da categoria não pode estar vazio.");
  }
  if (input.parentId !== null && !getCategoryById(nodes, input.parentId)) {
    throw new Error(`Categoria pai não encontrada: ${input.parentId}`);
  }
  const colorToken =
    input.colorToken && isValidCategoryColorToken(input.colorToken)
      ? input.colorToken
      : null;

  const created: CategoryNode = {
    id: buildUniqueId(nodes, input.parentId, label),
    label,
    parentId: input.parentId,
    colorToken,
    builtIn: false,
  };
  return {
    nodes: [...nodes, created],
    created,
  };
}

export function updateCategory(
  nodes: ReadonlyArray<CategoryNode>,
  id: string,
  patch: UpdateCategoryInput,
): CategoryNode[] {
  const target = getCategoryById(nodes, id);
  if (!target) {
    throw new Error(`Categoria não encontrada: ${id}`);
  }
  if (target.builtIn) {
    throw new Error("Categorias nativas não podem ser alteradas.");
  }

  const nextLabel =
    patch.label !== undefined ? patch.label.trim() : target.label;
  if (!nextLabel) {
    throw new Error("O nome da categoria não pode estar vazio.");
  }

  let nextParentId = target.parentId;
  if (patch.parentId !== undefined) {
    if (patch.parentId !== null) {
      if (!getCategoryById(nodes, patch.parentId)) {
        throw new Error(`Categoria pai não encontrada: ${patch.parentId}`);
      }
      const descendants = getDescendantIds(nodes, id);
      if (descendants.has(patch.parentId)) {
        throw new Error(
          "Não é possível mover uma categoria para dentro dela mesma.",
        );
      }
    }
    nextParentId = patch.parentId;
  }

  const nextColorToken =
    patch.colorToken !== undefined
      ? patch.colorToken && isValidCategoryColorToken(patch.colorToken)
        ? patch.colorToken
        : null
      : target.colorToken;

  return nodes.map((node) =>
    node.id === id
      ? {
          ...node,
          label: nextLabel,
          parentId: nextParentId,
          colorToken: nextColorToken,
        }
      : node,
  );
}

export function removeCategory(
  nodes: ReadonlyArray<CategoryNode>,
  id: string,
): { nodes: CategoryNode[]; fallbackCategoryId: string | null } {
  const target = getCategoryById(nodes, id);
  if (!target) {
    return { nodes: [...nodes], fallbackCategoryId: null };
  }
  if (target.builtIn) {
    throw new Error("Categorias nativas não podem ser excluídas.");
  }

  const fallbackCategoryId = target.parentId;
  const nextNodes = nodes
    .filter((node) => node.id !== id)
    .map((node) =>
      node.parentId === id ? { ...node, parentId: fallbackCategoryId } : node,
    );

  return { nodes: nextNodes, fallbackCategoryId };
}

export function extractCustomCategoriesForPins(
  nodes: ReadonlyArray<CategoryNode>,
  pinCategoryIds: ReadonlyArray<string | null | undefined>,
): CategoryNode[] {
  const includedIds = new Set<string>();
  const result: CategoryNode[] = [];

  for (const catId of pinCategoryIds) {
    const chain = getAncestorChain(nodes, catId);
    for (const node of chain) {
      if (!node.builtIn && !includedIds.has(node.id)) {
        includedIds.add(node.id);
        result.push({ ...node });
      }
    }
  }
  return result;
}

export function mergeCategories(
  baseNodes: ReadonlyArray<CategoryNode>,
  incomingNodes: ReadonlyArray<unknown>,
): CategoryNode[] {
  const builtInIds = new Set(BUILT_IN_CATEGORIES.map((n) => n.id));
  const merged = new Map<string, CategoryNode>();

  for (const builtIn of createDefaultCategoryTree()) {
    merged.set(builtIn.id, builtIn);
  }
  for (const node of baseNodes) {
    if (!builtInIds.has(node.id)) {
      merged.set(node.id, { ...node, builtIn: false });
    }
  }

  for (const raw of incomingNodes) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = raw as Partial<CategoryNode>;
    if (
      typeof candidate.id !== "string" ||
      !candidate.id.trim() ||
      typeof candidate.label !== "string" ||
      !candidate.label.trim()
    ) {
      continue;
    }
    const id = candidate.id.trim();
    if (builtInIds.has(id)) continue;

    const parentId =
      typeof candidate.parentId === "string" && candidate.parentId.trim()
        ? candidate.parentId.trim()
        : null;

    if (parentId === id) continue;

    merged.set(id, {
      id,
      label: candidate.label.trim(),
      parentId,
      colorToken: isValidCategoryColorToken(candidate.colorToken)
        ? candidate.colorToken
        : null,
      builtIn: false,
    });
  }

  // Break any dangling parent references or cycles safely.
  const list = Array.from(merged.values());
  const byId = new Map(list.map((n) => [n.id, n]));
  for (const node of list) {
    if (node.parentId && !byId.has(node.parentId)) {
      node.parentId = null;
      continue;
    }
    const seen = new Set<string>([node.id]);
    let cur = node.parentId ? byId.get(node.parentId) : undefined;
    while (cur) {
      if (seen.has(cur.id)) {
        node.parentId = null;
        break;
      }
      seen.add(cur.id);
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
  }

  return list;
}

export function flattenTreeForDisplay(
  nodes: ReadonlyArray<CategoryNode>,
  allowedIds?: ReadonlySet<string>,
): FlattenedCategoryItem[] {
  const result: FlattenedCategoryItem[] = [];
  const visited = new Set<string>();

  function visit(parentId: string | null, depth: number, trail: string[]) {
    const children = nodes.filter((n) => n.parentId === parentId);
    for (const child of children) {
      if (visited.has(child.id)) continue;
      if (allowedIds && !allowedIds.has(child.id)) continue;
      visited.add(child.id);
      const nextTrail = [...trail, child.label];
      result.push({
        node: child,
        depth,
        resolvedColorToken: resolveCategoryColorToken(nodes, child.id),
        pathLabels: nextTrail,
      });
      visit(child.id, depth + 1, nextTrail);
    }
  }

  visit(null, 0, []);
  return result;
}

export function isHiddenByAncestors(
  nodes: ReadonlyArray<CategoryNode>,
  categoryId: string | null | undefined,
  hiddenIds: ReadonlySet<string>,
): boolean {
  if (!categoryId || hiddenIds.size === 0) return false;
  const chain = getAncestorChain(nodes, categoryId);
  return chain.some((node) => hiddenIds.has(node.id));
}

export function collectAutoExpandedIds(
  nodes: ReadonlyArray<CategoryNode>,
  targetCategoryIds: ReadonlyArray<string | null | undefined>,
): Set<string> {
  const expanded = new Set<string>();
  for (const id of targetCategoryIds) {
    const chain = getAncestorChain(nodes, id);
    // Expand every ancestor up to (and including) the node itself so nested pins show.
    for (const node of chain) {
      expanded.add(node.id);
    }
  }
  return expanded;
}

export interface CollapsibleTreeItem extends FlattenedCategoryItem {
  hasChildCategories: boolean;
  isExpanded: boolean;
}

export function getCollapsibleTreeItems(
  nodes: ReadonlyArray<CategoryNode>,
  expandedIds: ReadonlySet<string>,
  allowedIds?: ReadonlySet<string>,
): CollapsibleTreeItem[] {
  const result: CollapsibleTreeItem[] = [];
  const visited = new Set<string>();

  function visit(parentId: string | null, depth: number, trail: string[]) {
    const children = nodes.filter(
      (n) => n.parentId === parentId && (!allowedIds || allowedIds.has(n.id)),
    );
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      const grandChildren = nodes.filter(
        (n) => n.parentId === child.id && (!allowedIds || allowedIds.has(n.id)),
      );
      const hasChildCategories = grandChildren.length > 0;
      const isExpanded = expandedIds.has(child.id);
      const nextTrail = [...trail, child.label];
      result.push({
        node: child,
        depth,
        resolvedColorToken: resolveCategoryColorToken(nodes, child.id),
        pathLabels: nextTrail,
        hasChildCategories,
        isExpanded,
      });
      if (isExpanded) {
        visit(child.id, depth + 1, nextTrail);
      }
    }
  }

  visit(null, 0, []);
  return result;
}
