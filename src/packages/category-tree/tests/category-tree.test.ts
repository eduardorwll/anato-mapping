import { describe, expect, it } from "vitest";
import {
  SYSTEMS_ROOT_ID,
  addCategory,
  collectAutoExpandedIds,
  createDefaultCategoryTree,
  extractCustomCategoriesForPins,
  flattenTreeForDisplay,
  getAncestorChain,
  getChildren,
  getCollapsibleTreeItems,
  isHiddenByAncestors,
  matchesCategoryFilter,
  mergeCategories,
  removeCategory,
  resolveCategoryColorToken,
  updateCategory,
} from "../index";

describe("category-tree", () => {
  it("seeds Sistemas root with the 12 Portuguese human body systems", () => {
    const tree = createDefaultCategoryTree();
    const systems = getChildren(tree, SYSTEMS_ROOT_ID);

    expect(systems).toHaveLength(12);
    expect(systems.map((s) => s.label)).toEqual([
      "Esquelético",
      "Articular",
      "Muscular",
      "Nervoso",
      "Cardiovascular",
      "Respiratório",
      "Digestório",
      "Urinário",
      "Reprodutor",
      "Endócrino",
      "Linfático",
      "Tegumentar",
    ]);
  });

  it("supports creating nested custom children and custom roots with color inheritance", () => {
    const base = createDefaultCategoryTree();
    const step1 = addCategory(base, {
      label: "Acidentes Ósseos",
      parentId: "sistemas.esqueletico",
    });
    const step2 = addCategory(step1.nodes, {
      label: "Sulcos",
      parentId: step1.created.id,
    });
    const customRoot = addCategory(step2.nodes, {
      label: "Referências Clínicas",
      parentId: null,
      colorToken: "--pin-cat-nervous",
    });

    expect(resolveCategoryColorToken(customRoot.nodes, step2.created.id)).toBe(
      "--pin-cat-skeletal",
    );
    expect(
      resolveCategoryColorToken(customRoot.nodes, customRoot.created.id),
    ).toBe("--pin-cat-nervous");

    const chain = getAncestorChain(customRoot.nodes, step2.created.id);
    expect(chain.map((n) => n.label)).toEqual([
      "Sistemas",
      "Esquelético",
      "Acidentes Ósseos",
      "Sulcos",
    ]);
  });

  it("matches descendant pins when filtering by a parent category", () => {
    const base = createDefaultCategoryTree();
    const { nodes, created: sub } = addCategory(base, {
      label: "Elevações",
      parentId: "sistemas.esqueletico",
    });

    expect(matchesCategoryFilter(nodes, sub.id, "sistemas.esqueletico")).toBe(
      true,
    );
    expect(matchesCategoryFilter(nodes, sub.id, SYSTEMS_ROOT_ID)).toBe(true);
    expect(matchesCategoryFilter(nodes, sub.id, "sistemas.digestorio")).toBe(
      false,
    );
  });

  it("prevents deleting built-in nodes and safely reparents children on custom delete", () => {
    const base = createDefaultCategoryTree();
    expect(() => removeCategory(base, "sistemas.esqueletico")).toThrow();

    const step1 = addCategory(base, {
      label: "Acidentes",
      parentId: "sistemas.esqueletico",
    });
    const step2 = addCategory(step1.nodes, {
      label: "Forames",
      parentId: step1.created.id,
    });

    const removed = removeCategory(step2.nodes, step1.created.id);
    expect(removed.fallbackCategoryId).toBe("sistemas.esqueletico");
    const forames = removed.nodes.find((n) => n.id === step2.created.id);
    expect(forames?.parentId).toBe("sistemas.esqueletico");
  });

  it("rejects cycles when reparenting custom categories", () => {
    const base = createDefaultCategoryTree();
    const parent = addCategory(base, {
      label: "Grupo A",
      parentId: "sistemas.esqueletico",
    });
    const child = addCategory(parent.nodes, {
      label: "Subgrupo B",
      parentId: parent.created.id,
    });

    expect(() =>
      updateCategory(child.nodes, parent.created.id, {
        parentId: child.created.id,
      }),
    ).toThrow();
  });

  it("extracts and merges custom category snapshots for cross-PC JSON portability", () => {
    const base = createDefaultCategoryTree();
    const s1 = addCategory(base, {
      label: "Acidentes Ósseos",
      parentId: "sistemas.esqueletico",
    });
    const s2 = addCategory(s1.nodes, {
      label: "Sulcos",
      parentId: s1.created.id,
      colorToken: "--pin-cat-articular",
    });
    const unused = addCategory(s2.nodes, {
      label: "Não Usada",
      parentId: "sistemas.digestorio",
    });

    const snapshot = extractCustomCategoriesForPins(unused.nodes, [
      s2.created.id,
      "sistemas.muscular",
    ]);
    expect(snapshot.map((n) => n.label)).toEqual([
      "Acidentes Ósseos",
      "Sulcos",
    ]);

    const mergedOnOtherPc = mergeCategories(
      createDefaultCategoryTree(),
      snapshot,
    );
    expect(
      resolveCategoryColorToken(mergedOnOtherPc, s2.created.id),
    ).toBe("--pin-cat-articular");

    const flattened = flattenTreeForDisplay(mergedOnOtherPc);
    const sulcosItem = flattened.find((f) => f.node.id === s2.created.id);
    expect(sulcosItem?.depth).toBe(3);
  });

  it("supports branch visibility hiding, auto-expand on search, and collapsible traversal", () => {
    const base = createDefaultCategoryTree();
    const { nodes, created: sub } = addCategory(base, {
      label: "Acidentes Ósseos",
      parentId: "sistemas.esqueletico",
    });

    const hidden = new Set(["sistemas.esqueletico"]);
    expect(isHiddenByAncestors(nodes, sub.id, hidden)).toBe(true);
    expect(isHiddenByAncestors(nodes, "sistemas.digestorio", hidden)).toBe(false);

    const expandedForSub = collectAutoExpandedIds(nodes, [sub.id]);
    expect(expandedForSub.has(SYSTEMS_ROOT_ID)).toBe(true);
    expect(expandedForSub.has("sistemas.esqueletico")).toBe(true);
    expect(expandedForSub.has(sub.id)).toBe(true);

    const collapsed = getCollapsibleTreeItems(nodes, new Set());
    expect(collapsed.map((i) => i.node.id)).toEqual([SYSTEMS_ROOT_ID]);
    expect(collapsed[0].hasChildCategories).toBe(true);

    const expanded = getCollapsibleTreeItems(nodes, expandedForSub);
    expect(expanded.some((i) => i.node.id === sub.id)).toBe(true);
  });
});
