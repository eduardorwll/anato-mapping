import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FolderOpen,
  GitBranch,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getFormatBadge } from "../packages/annotation-schema/formats";
import type {
  AnatomicalTaxonomy,
  Pin,
} from "../packages/annotation-schema/index";
import {
  CATEGORY_COLOR_TOKENS,
  type CategoryColorToken,
  type CategoryNode,
  SYSTEMS_ROOT_ID,
  collectAutoExpandedIds,
  getCollapsibleTreeItems,
  getDescendantIds,
  isHiddenByAncestors,
} from "../packages/category-tree/index";
import { cssVarForToken } from "../packages/design-tokens/index";
import type { WorkspaceImageEntry } from "../packages/workspace-gateway/index";
import { CollapsibleSection } from "./CollapsibleSection";
import { ThreeBarToggle } from "./ThreeBarToggle";

interface ToolboxNavigatorProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  onExpand: () => void;
  folderName: string | null;
  folderEntries: ReadonlyArray<WorkspaceImageEntry>;
  activeEntryPath: string | null;
  onSelectEntry: (entry: WorkspaceImageEntry) => void;
  categories: ReadonlyArray<CategoryNode>;
  pins: ReadonlyArray<Pin>;
  selectedPinId: string | null;
  hiddenCategoryIds: ReadonlySet<string>;
  searchQuery: string;
  taxonomy: AnatomicalTaxonomy;
  onSelectPin: (pinId: string) => void;
  onFocusPin: (pinId: string) => void;
  onToggleCategoryVisibility: (categoryId: string) => void;
  onAddCategory: (input: {
    label: string;
    parentId: string | null;
    colorToken: CategoryColorToken | null;
  }) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateTaxonomy: (patch: Partial<AnatomicalTaxonomy>) => void;
}

export function ToolboxNavigator({
  expanded,
  onToggleExpanded,
  onExpand,
  folderName,
  folderEntries,
  activeEntryPath,
  onSelectEntry,
  categories,
  pins,
  selectedPinId,
  hiddenCategoryIds,
  searchQuery,
  taxonomy,
  onSelectPin,
  onFocusPin,
  onToggleCategoryVisibility,
  onAddCategory,
  onDeleteCategory,
  onUpdateTaxonomy,
}: ToolboxNavigatorProps) {
  const [folderOpen, setFolderOpen] = useState(Boolean(folderName));
  const [treeOpen, setTreeOpen] = useState(true);
  const [specimenOpen, setSpecimenOpen] = useState(false);

  const [folderQuery, setFolderQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set([SYSTEMS_ROOT_ID, "sistemas.esqueletico"]),
  );
  const [uncategorizedExpanded, setUncategorizedExpanded] = useState(true);

  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [newCatLabel, setNewCatLabel] = useState("");
  const [newCatColor, setNewCatColor] = useState<CategoryColorToken | "">("");

  useEffect(() => {
    if (folderName) setFolderOpen(true);
  }, [folderName]);

  // Two-way sync: selecting a pin on canvas auto-expands ancestor branches.
  useEffect(() => {
    if (!selectedPinId) return;
    const pin = pins.find((p) => p.id === selectedPinId);
    if (!pin?.categoryId) return;
    const needed = collectAutoExpandedIds(categories, [pin.categoryId]);
    setExpandedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of needed) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [categories, pins, selectedPinId]);

  const searchLower = searchQuery.trim().toLowerCase();
  const matchingPins = useMemo(() => {
    if (!searchLower) return pins;
    return pins.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.tags.some((t) => t.toLowerCase().includes(searchLower)),
    );
  }, [pins, searchLower]);

  const effectiveExpandedIds = useMemo(() => {
    if (!searchLower) return expandedIds;
    const auto = collectAutoExpandedIds(
      categories,
      matchingPins.map((p) => p.categoryId),
    );
    return new Set([...expandedIds, ...auto]);
  }, [categories, expandedIds, matchingPins, searchLower]);

  const pinIndexById = useMemo(() => {
    const map = new Map<string, number>();
    pins.forEach((p, idx) => map.set(p.id, idx + 1));
    return map;
  }, [pins]);

  const pinsByCategory = useMemo(() => {
    const map = new Map<string, Pin[]>();
    const uncategorized: Pin[] = [];
    for (const pin of matchingPins) {
      if (pin.categoryId) {
        const list = map.get(pin.categoryId) ?? [];
        list.push(pin);
        map.set(pin.categoryId, list);
      } else {
        uncategorized.push(pin);
      }
    }
    return { map, uncategorized };
  }, [matchingPins]);

  const treeItems = useMemo(() => {
    const items = getCollapsibleTreeItems(categories, effectiveExpandedIds);
    return items.map((item) => {
      const descendants = getDescendantIds(categories, item.node.id);
      let count = 0;
      for (const id of descendants) {
        count += pinsByCategory.map.get(id)?.length ?? 0;
      }
      const directPins = pinsByCategory.map.get(item.node.id) ?? [];
      return {
        ...item,
        pinCount: count,
        directPins,
        expandable: item.hasChildCategories || directPins.length > 0,
      };
    });
  }, [categories, effectiveExpandedIds, pinsByCategory.map]);

  const filteredFolderEntries = useMemo(() => {
    const q = folderQuery.trim().toLowerCase();
    if (!q) return folderEntries;
    return folderEntries.filter((e) => e.fileName.toLowerCase().includes(q));
  }, [folderEntries, folderQuery]);

  const mappedFolderCount = useMemo(
    () => folderEntries.filter((e) => e.hasJson || e.pinCount > 0).length,
    [folderEntries],
  );

  const goRelativeEntry = (delta: number) => {
    if (folderEntries.length === 0) return;
    const idx = folderEntries.findIndex((e) => e.path === activeEntryPath);
    const nextIdx =
      idx < 0
        ? 0
        : (idx + delta + folderEntries.length) % folderEntries.length;
    onSelectEntry(folderEntries[nextIdx]);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const submitNewCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newCatLabel.trim();
    if (!label || !creatingParentId) return;
    const parentId = creatingParentId === "__root__" ? null : creatingParentId;
    onAddCategory({
      label,
      parentId,
      colorToken: newCatColor === "" ? null : newCatColor,
    });
    if (parentId) {
      setExpandedIds((prev) => new Set([...prev, parentId]));
    }
    setNewCatLabel("");
    setNewCatColor("");
    setCreatingParentId(null);
  };

  const openSectionFromRail = (section: "folder" | "tree" | "specimen") => {
    if (section === "folder") setFolderOpen(true);
    if (section === "tree") setTreeOpen(true);
    if (section === "specimen") setSpecimenOpen(true);
    onExpand();
  };

  return (
    <aside
      aria-label="Navegador"
      data-testid="toolbox-navigator"
      data-expanded={expanded ? "true" : "false"}
      className="nav-rail flex h-full shrink-0 flex-col overflow-hidden border-r text-xs"
      style={{
        backgroundColor: "var(--color-background)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Top Bar Inside Navigator Tab — Three-Bar Toggle anchored at fixed (x, y) */}
      <div
        className="flex h-10 shrink-0 items-center gap-2 border-b px-2"
        style={{ borderColor: "var(--color-border)" }}
      >
        <ThreeBarToggle
          expanded={expanded}
          onToggle={onToggleExpanded}
          label="Navegador"
        />

        {expanded && (
          <div className="animate-rail-in flex min-w-0 flex-1 items-center justify-between">
            <span
              className="truncate text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              Navegador
            </span>
            <button
              type="button"
              aria-label="Nova categoria raiz"
              title="Nova categoria raiz"
              onClick={() => {
                setTreeOpen(true);
                setCreatingParentId((cur) =>
                  cur === "__root__" ? null : "__root__",
                );
              }}
              className="btn-tactile flex h-6 w-6 cursor-pointer items-center justify-center rounded-md"
              style={{
                backgroundColor: "var(--color-interest-soft)",
                color: "var(--color-interest)",
              }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* COMPACT 44px ICON RAIL */}
      {!expanded ? (
        <div
          data-testid="toolbox-compact-rail"
          className="animate-rail-in flex flex-1 flex-col items-center gap-1.5 py-2.5"
        >
          {folderName && (
            <button
              type="button"
              aria-label="Abrir seção Pasta"
              title={folderName}
              onClick={() => openSectionFromRail("folder")}
              className="btn-tactile flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg"
              style={{
                backgroundColor: folderOpen
                  ? "var(--color-interest-soft)"
                  : "transparent",
                color: folderOpen
                  ? "var(--color-interest)"
                  : "var(--color-muted-foreground)",
              }}
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Abrir seção Árvore"
            title="Árvore"
            onClick={() => openSectionFromRail("tree")}
            className="btn-tactile flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg"
            style={{
              backgroundColor: treeOpen
                ? "var(--color-interest-soft)"
                : "transparent",
              color: treeOpen
                ? "var(--color-interest)"
                : "var(--color-muted-foreground)",
            }}
          >
            <GitBranch className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Abrir seção Peça"
            title="Peça"
            onClick={() => openSectionFromRail("specimen")}
            className="btn-tactile flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg"
            style={{
              backgroundColor: specimenOpen
                ? "var(--color-interest-soft)"
                : "transparent",
              color: specimenOpen
                ? "var(--color-interest)"
                : "var(--color-muted-foreground)",
            }}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>
      ) : (
        /* EXPANDED 288px OUTLINER BODY */
        <div className="animate-rail-in flex min-h-0 flex-1 flex-col">
          {/* SECTION 1: Retractable Folder Workspace */}
          {folderName && (
            <section
              className="flex flex-col border-b"
              style={{ borderColor: "var(--color-border)" }}
            >
              <div className="flex items-center justify-between px-2 py-2">
                <button
                  type="button"
                  aria-expanded={folderOpen}
                  onClick={() => setFolderOpen((o) => !o)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left font-semibold"
                >
                  <ChevronRight
                    data-open={folderOpen ? "true" : "false"}
                    className="chevron-rotate h-3.5 w-3.5 shrink-0"
                  />
                  <FolderOpen
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: "var(--color-interest)" }}
                  />
                  <span className="truncate">{folderName}</span>
                  <span
                    className="ml-auto font-mono text-[10px] font-normal"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    {mappedFolderCount}/{folderEntries.length}
                  </span>
                </button>
                <div className="ml-1 flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label="Imagem anterior"
                    onClick={() => goRelativeEntry(-1)}
                    className="btn-tactile cursor-pointer rounded p-1 hover:opacity-80"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próxima imagem"
                    onClick={() => goRelativeEntry(1)}
                    className="btn-tactile cursor-pointer rounded p-1 hover:opacity-80"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <CollapsibleSection open={folderOpen}>
                <div className="flex max-h-44 flex-col">
                  <div
                    className="h-0.5 w-full"
                    style={{ backgroundColor: "var(--color-muted)" }}
                  >
                    <div
                      className="h-full transition-all duration-200"
                      style={{
                        width: `${folderEntries.length > 0 ? (mappedFolderCount / folderEntries.length) * 100 : 0}%`,
                        backgroundColor: "var(--color-interest)",
                      }}
                    />
                  </div>
                  <div className="px-2 pt-2">
                    <input
                      type="text"
                      value={folderQuery}
                      onChange={(e) => setFolderQuery(e.target.value)}
                      placeholder="Filtrar pasta..."
                      className="w-full rounded-md px-2 py-1 text-[11px] focus:outline-none"
                      style={{
                        backgroundColor: "var(--color-muted)",
                        color: "var(--color-foreground)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-1.5">
                    {filteredFolderEntries.map((entry) => {
                      const active = entry.path === activeEntryPath;
                      const mapped = entry.hasJson || entry.pinCount > 0;
                      return (
                        <button
                          key={entry.path}
                          type="button"
                          onClick={() => onSelectEntry(entry)}
                          className="btn-tactile flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1 text-left"
                          style={{
                            backgroundColor: active
                              ? "var(--color-interest-soft)"
                              : "transparent",
                            color: active
                              ? "var(--color-interest)"
                              : "var(--color-foreground)",
                          }}
                        >
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: mapped
                                  ? "var(--color-interest)"
                                  : "var(--color-border-strong)",
                              }}
                            />
                            <span className="truncate text-[11px]">
                              {entry.fileName}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1">
                            {entry.pinCount > 0 && (
                              <span
                                className="font-mono text-[10px]"
                                style={{ color: "var(--color-interest)" }}
                              >
                                {entry.pinCount}
                              </span>
                            )}
                            <span
                              className="rounded px-1 font-mono text-[9px]"
                              style={{
                                backgroundColor: "var(--color-muted)",
                                color: "var(--color-muted-foreground)",
                              }}
                            >
                              {getFormatBadge(entry.fileName)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CollapsibleSection>
            </section>
          )}

          {/* SECTION 2: Retractable Category & Pin Outliner Tree */}
          <section
            className={`flex flex-col border-b ${treeOpen ? "min-h-0 flex-1" : ""}`}
            style={{ borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-between px-2 py-2">
              <button
                type="button"
                aria-expanded={treeOpen}
                onClick={() => setTreeOpen((o) => !o)}
                className="flex flex-1 cursor-pointer items-center gap-1.5 text-left font-semibold"
              >
                <ChevronRight
                  data-open={treeOpen ? "true" : "false"}
                  className="chevron-rotate h-3.5 w-3.5"
                />
                <span>Árvore</span>
                <span
                  className="ml-auto font-mono text-[10px] font-normal"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {pins.length}
                </span>
              </button>
            </div>

            {/* Smooth Inline Category Creator */}
            <CollapsibleSection open={treeOpen && Boolean(creatingParentId)}>
              {creatingParentId && (
                <form
                  onSubmit={submitNewCategory}
                  className="mx-2 mb-2 flex flex-col gap-1.5 rounded-lg p-2"
                  style={{
                    backgroundColor: "var(--color-muted)",
                    border: "1px solid var(--color-interest-border)",
                  }}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className="truncate font-medium"
                      style={{ color: "var(--color-interest)" }}
                    >
                      {creatingParentId === "__root__"
                        ? "Raiz"
                        : `Em: ${categories.find((c) => c.id === creatingParentId)?.label ?? ""}`}
                    </span>
                    <button
                      type="button"
                      aria-label="Cancelar nova categoria"
                      onClick={() => setCreatingParentId(null)}
                      className="btn-tactile cursor-pointer rounded p-0.5"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    autoFocus
                    aria-label="Nova categoria"
                    value={newCatLabel}
                    onChange={(e) => setNewCatLabel(e.target.value)}
                    placeholder="Nome"
                    className="w-full rounded px-2 py-1 text-[11px] focus:outline-none"
                    style={{
                      backgroundColor: "var(--color-background)",
                      color: "var(--color-foreground)",
                      border: "1px solid var(--color-border)",
                    }}
                  />
                  <div className="flex gap-1.5">
                    <select
                      aria-label="Cor da categoria"
                      value={newCatColor}
                      onChange={(e) =>
                        setNewCatColor(
                          e.target.value as CategoryColorToken | "",
                        )
                      }
                      className="flex-1 rounded px-1.5 py-1 text-[11px] focus:outline-none"
                      style={{
                        backgroundColor: "var(--color-background)",
                        color: "var(--color-foreground)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <option value="">Herdar</option>
                      {CATEGORY_COLOR_TOKENS.map((swatch) => (
                        <option key={swatch.token} value={swatch.token}>
                          {swatch.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={!newCatLabel.trim()}
                      className="btn-tactile cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium disabled:opacity-40"
                      style={{
                        backgroundColor: "var(--color-interest)",
                        color: "var(--color-interest-foreground)",
                      }}
                    >
                      Criar
                    </button>
                  </div>
                </form>
              )}
            </CollapsibleSection>

            {treeOpen && (
              <div
                role="tree"
                aria-label="Árvore de categorias e pins"
                className="flex-1 overflow-y-auto px-1.5 pb-2"
              >
                {treeItems.map((item) => {
                  const hiddenDirectly = hiddenCategoryIds.has(item.node.id);
                  const hiddenInherited = isHiddenByAncestors(
                    categories,
                    item.node.id,
                    hiddenCategoryIds,
                  );

                  return (
                    <div key={item.node.id}>
                      <div
                        role="treeitem"
                        aria-expanded={
                          item.expandable ? item.isExpanded : undefined
                        }
                        className="group relative flex items-center rounded-md py-0.5 pr-1 transition-opacity duration-150"
                        style={{
                          paddingLeft: `${4 + item.depth * 14}px`,
                          opacity: hiddenInherited ? 0.48 : 1,
                        }}
                      >
                        {Array.from({ length: item.depth }).map((_, d) => (
                          <span
                            key={d}
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-0 top-0 w-px"
                            style={{
                              left: `${12 + d * 14}px`,
                              backgroundColor: "var(--color-border)",
                            }}
                          />
                        ))}

                        {item.expandable ? (
                          <button
                            type="button"
                            aria-label={
                              item.isExpanded
                                ? `Recolher ${item.node.label}`
                                : `Expandir ${item.node.label}`
                            }
                            onClick={() => toggleExpand(item.node.id)}
                            className="btn-tactile flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded hover:opacity-80"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            <ChevronRight
                              data-open={item.isExpanded ? "true" : "false"}
                              className="chevron-rotate h-3.5 w-3.5"
                            />
                          </button>
                        ) : (
                          <span className="w-6 shrink-0" />
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            if (item.expandable) toggleExpand(item.node.id);
                          }}
                          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 py-0.5 text-left"
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{
                              backgroundColor: cssVarForToken(
                                item.resolvedColorToken,
                              ),
                              border: "1.5px solid var(--pin-ring-color)",
                            }}
                          />
                          <span className="truncate font-medium">
                            {item.node.label}
                          </span>
                          {item.pinCount > 0 && (
                            <span
                              className="ml-1 font-mono text-[10px]"
                              style={{ color: "var(--color-muted-foreground)" }}
                            >
                              {item.pinCount}
                            </span>
                          )}
                        </button>

                        <div
                          className={`flex shrink-0 items-center gap-0.5 transition-all duration-150 ${
                            hiddenDirectly
                              ? "translate-x-0 opacity-100"
                              : "translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 focus-within:translate-x-0 focus-within:opacity-100"
                          }`}
                        >
                          <button
                            type="button"
                            aria-label={
                              hiddenDirectly
                                ? `Mostrar ${item.node.label}`
                                : `Ocultar ${item.node.label}`
                            }
                            title={hiddenDirectly ? "Mostrar" : "Ocultar"}
                            onClick={() =>
                              onToggleCategoryVisibility(item.node.id)
                            }
                            className="btn-tactile flex h-5 w-5 cursor-pointer items-center justify-center rounded"
                            style={{
                              color: hiddenDirectly
                                ? "var(--color-interest)"
                                : "var(--color-muted-foreground)",
                            }}
                          >
                            {hiddenDirectly ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            type="button"
                            aria-label={`Adicionar subcategoria em ${item.node.label}`}
                            title="Nova subcategoria"
                            onClick={() => setCreatingParentId(item.node.id)}
                            className="btn-tactile flex h-5 w-5 cursor-pointer items-center justify-center rounded"
                            style={{ color: "var(--color-muted-foreground)" }}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                          {!item.node.builtIn && (
                            <button
                              type="button"
                              aria-label={`Excluir ${item.node.label}`}
                              title="Excluir"
                              onClick={() => onDeleteCategory(item.node.id)}
                              className="btn-tactile flex h-5 w-5 cursor-pointer items-center justify-center rounded"
                              style={{ color: "var(--color-destructive)" }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {item.directPins.length > 0 && (
                        <CollapsibleSection open={item.isExpanded}>
                          <div>
                            {item.directPins.map((pin) => {
                              const selected = pin.id === selectedPinId;
                              const pinNum = pinIndexById.get(pin.id) ?? 1;
                              return (
                                <button
                                  key={pin.id}
                                  type="button"
                                  onClick={() => onSelectPin(pin.id)}
                                  onDoubleClick={() => onFocusPin(pin.id)}
                                  className="btn-tactile relative flex w-full cursor-pointer items-center justify-between gap-2 rounded-md py-1 pr-2 text-left text-[11px]"
                                  style={{
                                    paddingLeft: `${28 + item.depth * 14}px`,
                                    backgroundColor: selected
                                      ? "var(--color-interest-soft)"
                                      : "transparent",
                                    color: selected
                                      ? "var(--color-interest)"
                                      : "var(--color-foreground)",
                                  }}
                                >
                                  {Array.from({ length: item.depth + 1 }).map(
                                    (_, d) => (
                                      <span
                                        key={d}
                                        aria-hidden="true"
                                        className="pointer-events-none absolute bottom-0 top-0 w-px"
                                        style={{
                                          left: `${12 + d * 14}px`,
                                          backgroundColor:
                                            "var(--color-border)",
                                        }}
                                      />
                                    ),
                                  )}
                                  <span className="flex min-w-0 items-center gap-1.5">
                                    <span
                                      className="font-mono text-[10px]"
                                      style={{
                                        color: "var(--color-muted-foreground)",
                                      }}
                                    >
                                      #{String(pinNum).padStart(2, "0")}
                                    </span>
                                    <span className="truncate">
                                      {pin.name || `Pin ${pinNum}`}
                                    </span>
                                  </span>
                                  <span
                                    className="shrink-0 font-mono text-[9px]"
                                    style={{
                                      color: "var(--color-muted-foreground)",
                                    }}
                                  >
                                    {pin.x.toFixed(0)}%,{pin.y.toFixed(0)}%
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </CollapsibleSection>
                      )}
                    </div>
                  );
                })}

                {pinsByCategory.uncategorized.length > 0 && (
                  <div className="mt-1">
                    <button
                      type="button"
                      onClick={() => setUncategorizedExpanded((v) => !v)}
                      className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-left font-medium"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      <ChevronRight
                        data-open={uncategorizedExpanded ? "true" : "false"}
                        className="chevron-rotate h-3.5 w-3.5"
                      />
                      <span>Sem categoria</span>
                      <span className="ml-auto font-mono text-[10px]">
                        {pinsByCategory.uncategorized.length}
                      </span>
                    </button>
                    <CollapsibleSection open={uncategorizedExpanded}>
                      <div>
                        {pinsByCategory.uncategorized.map((pin) => {
                          const selected = pin.id === selectedPinId;
                          const pinNum = pinIndexById.get(pin.id) ?? 1;
                          return (
                            <button
                              key={pin.id}
                              type="button"
                              onClick={() => onSelectPin(pin.id)}
                              onDoubleClick={() => onFocusPin(pin.id)}
                              className="btn-tactile flex w-full cursor-pointer items-center justify-between rounded-md py-1 pl-7 pr-2 text-left text-[11px]"
                              style={{
                                backgroundColor: selected
                                  ? "var(--color-interest-soft)"
                                  : "transparent",
                                color: selected
                                  ? "var(--color-interest)"
                                  : "var(--color-foreground)",
                              }}
                            >
                              <span className="truncate">
                                #{pinNum} {pin.name || `Pin ${pinNum}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleSection>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SECTION 3: Retractable Specimen Taxonomy Accordion */}
          <section className="flex flex-col">
            <button
              type="button"
              aria-expanded={specimenOpen}
              onClick={() => setSpecimenOpen((o) => !o)}
              className="flex w-full cursor-pointer items-center gap-1.5 px-2 py-2 text-left font-semibold"
            >
              <ChevronRight
                data-open={specimenOpen ? "true" : "false"}
                className="chevron-rotate h-3.5 w-3.5"
              />
              <span>Peça</span>
              {taxonomy.structure && (
                <span
                  className="ml-auto max-w-32 truncate text-[10px] font-normal"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {taxonomy.structure}
                </span>
              )}
            </button>

            <CollapsibleSection open={specimenOpen}>
              <div className="max-h-60 space-y-2 overflow-y-auto px-3 pb-3">
                {(
                  [
                    ["system", "Sistema"],
                    ["region", "Região"],
                    ["structure", "Estrutura"],
                    ["view", "Vista"],
                    ["bibliography", "Bibliografia"],
                    ["author", "Autor"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block space-y-0.5">
                    <span
                      className="text-[10px]"
                      style={{ color: "var(--color-muted-foreground)" }}
                    >
                      {label}
                    </span>
                    <input
                      type="text"
                      aria-label={label}
                      value={taxonomy[key]}
                      onChange={(e) =>
                        onUpdateTaxonomy({ [key]: e.target.value })
                      }
                      placeholder={label}
                      className="w-full rounded-md px-2 py-1 text-[11px] focus:outline-none"
                      style={{
                        backgroundColor: "var(--color-muted)",
                        color: "var(--color-foreground)",
                        border: "1px solid var(--color-border)",
                      }}
                    />
                  </label>
                ))}
              </div>
            </CollapsibleSection>
          </section>
        </div>
      )}
    </aside>
  );
}
