import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deriveJsonFileName } from "../packages/annotation-schema/formats";
import {
  type AnatomicalTaxonomy,
  type AnnotationDocumentV1,
  type Pin,
  createEmptyDocument,
  createPin,
  parseAndNormalizeDocument,
  serializeDocument,
} from "../packages/annotation-schema/index";
import {
  AtlasCanvas,
  type CanvasFocusRequest,
  type CanvasMode,
} from "../packages/atlas-canvas/index";
import {
  type CategoryColorToken,
  type CategoryNode,
  addCategory,
  createDefaultCategoryTree,
  isHiddenByAncestors,
  matchesCategoryFilter,
  mergeCategories,
  removeCategory,
} from "../packages/category-tree/index";
import {
  type ThemeId,
  applyTheme,
  getInitialTheme,
  toggleTheme,
} from "../packages/design-tokens/index";
import type { Point2D, Size2D } from "../packages/viewport-math/index";
import {
  type LoadedImageResource,
  type WorkspaceGateway,
  type WorkspaceImageEntry,
  createWorkspaceGateway,
  isTauriRuntime,
} from "../packages/workspace-gateway/index";
import { EmptyState } from "./EmptyState";
import { FloatingCard } from "./FloatingCard";
import { ToolboxNavigator } from "./ToolboxNavigator";
import { TopBar } from "./TopBar";

interface AppProps {
  gateway?: WorkspaceGateway;
}

export function App({ gateway: injectedGateway }: AppProps) {
  const gateway = useMemo(
    () => injectedGateway ?? createWorkspaceGateway(),
    [injectedGateway],
  );

  const [theme, setTheme] = useState<ThemeId>(() => getInitialTheme());
  const [mode, setMode] = useState<CanvasMode>("author");
  const [categories, setCategories] = useState<CategoryNode[]>(() =>
    createDefaultCategoryTree(),
  );

  // Workspace state
  const [folderName, setFolderName] = useState<string | null>(null);
  const [folderEntries, setFolderEntries] = useState<WorkspaceImageEntry[]>([]);
  const [navigatorOpen, setNavigatorOpen] = useState(true);

  const [activeEntry, setActiveEntry] = useState<WorkspaceImageEntry | null>(
    null,
  );
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const loadedResourceRef = useRef<LoadedImageResource | null>(null);

  const [doc, setDoc] = useState<AnnotationDocumentV1 | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Selection, right panel retract state, search, visibility & legend filter
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [rightPanelExpanded, setRightPanelExpanded] = useState(true);
  const [autoFocusPinNonce, setAutoFocusPinNonce] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [activeCategoryFilterId, setActiveCategoryFilterId] = useState<
    string | null
  >(null);
  const [focusRequest, setFocusRequest] = useState<CanvasFocusRequest | null>(
    null,
  );
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToast(message);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  const themeMountedRef = useRef(false);
  useEffect(() => {
    applyTheme(theme, { animate: themeMountedRef.current });
    themeMountedRef.current = true;
  }, [theme]);

  useEffect(() => {
    let active = true;
    gateway
      .loadCustomCategories()
      .then((custom) => {
        if (!active || custom.length === 0) return;
        setCategories((prev) => mergeCategories(prev, custom));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [gateway]);

  useEffect(() => {
    return () => {
      loadedResourceRef.current?.revoke();
    };
  }, []);

  const confirmDiscardIfDirty = useCallback((): boolean => {
    if (!isDirty) return true;
    return window.confirm("Descartar alterações não salvas?");
  }, [isDirty]);

  const openSpecimenEntry = useCallback(
    async (entry: WorkspaceImageEntry, skipDirtyCheck = false) => {
      if (!skipDirtyCheck && !confirmDiscardIfDirty()) return;
      try {
        const resource = await gateway.loadImageUrl(entry);
        loadedResourceRef.current?.revoke();
        loadedResourceRef.current = resource;

        let nextDoc = createEmptyDocument({
          fileName: entry.fileName,
          mimeType: entry.mimeType,
          width: 0,
          height: 0,
        });

        const siblingRaw = await gateway.readSiblingJson(entry);
        if (siblingRaw) {
          try {
            const parsed = parseAndNormalizeDocument(siblingRaw, nextDoc.image);
            nextDoc = parsed.document;
            if (parsed.importedCategories.length > 0) {
              setCategories((prev) =>
                mergeCategories(prev, parsed.importedCategories),
              );
            }
          } catch {
            showToast("JSON existente inválido");
          }
        }

        setActiveEntry(entry);
        setImageUrl(resource.url);
        setDoc(nextDoc);
        setIsDirty(false);
        setSelectedPinId(null);
        setSearchQuery("");
        setActiveCategoryFilterId(null);
        setHiddenCategoryIds(new Set());
      } catch {
        showToast("Falha ao abrir imagem");
      }
    },
    [confirmDiscardIfDirty, gateway, showToast],
  );

  const handleOpenFolder = useCallback(async () => {
    if (!confirmDiscardIfDirty()) return;
    const selection = await gateway.pickFolder();
    if (!selection) return;
    setFolderName(selection.folderName);
    setFolderEntries(selection.entries);
    setNavigatorOpen(true);
    if (selection.entries.length > 0) {
      await openSpecimenEntry(selection.entries[0], true);
    } else {
      showToast("Nenhuma imagem na pasta");
    }
  }, [confirmDiscardIfDirty, gateway, openSpecimenEntry, showToast]);

  const handleOpenSingleImage = useCallback(async () => {
    if (!confirmDiscardIfDirty()) return;
    const entry = await gateway.pickSingleImage();
    if (!entry) return;
    setFolderName(null);
    setFolderEntries([]);
    await openSpecimenEntry(entry, true);
  }, [confirmDiscardIfDirty, gateway, openSpecimenEntry]);

  // Native Tauri drag-drop listener
  useEffect(() => {
    if (!isTauriRuntime()) return;
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent(async (event) => {
        if (event.payload.type === "over") {
          setIsDraggingFile(true);
        } else if (event.payload.type === "leave") {
          setIsDraggingFile(false);
        } else if (event.payload.type === "drop") {
          setIsDraggingFile(false);
          const firstPath = event.payload.paths[0];
          if (!firstPath) return;
          const entry = await gateway.inspectDroppedPath(firstPath);
          if (entry) {
            setFolderName(null);
            setFolderEntries([]);
            await openSpecimenEntry(entry);
          }
        }
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});
    return () => {
      unlisten?.();
    };
  }, [gateway, openSpecimenEntry]);

  const handleSave = useCallback(async () => {
    if (!doc || !activeEntry) return;
    try {
      const json = serializeDocument(doc, categories);
      const { savedFileName } = await gateway.saveSiblingJson(
        activeEntry,
        json,
      );
      setIsDirty(false);
      setActiveEntry((prev) =>
        prev ? { ...prev, hasJson: true, pinCount: doc.pins.length } : prev,
      );
      setFolderEntries((prev) =>
        prev.map((item) =>
          item.path === activeEntry.path
            ? { ...item, hasJson: true, pinCount: doc.pins.length }
            : item,
        ),
      );
      showToast(`Salvo: ${savedFileName}`);
    } catch {
      showToast("Erro ao salvar JSON");
    }
  }, [activeEntry, categories, doc, gateway, showToast]);

  const handleSaveAs = useCallback(async () => {
    if (!doc) return;
    try {
      const json = serializeDocument(doc, categories);
      const suggested = deriveJsonFileName(doc.image.fileName);
      const res = await gateway.saveJsonAs(suggested, json);
      if (res) {
        setIsDirty(false);
        showToast(`Salvo: ${res.savedFileName}`);
      }
    } catch {
      showToast("Erro ao salvar JSON");
    }
  }, [categories, doc, gateway, showToast]);

  const handleImportJson = useCallback(async () => {
    if (!doc) return;
    const file = await gateway.importJsonFile();
    if (!file) return;
    try {
      const parsed = parseAndNormalizeDocument(file.content, doc.image);
      setDoc({
        ...parsed.document,
        image: {
          ...parsed.document.image,
          fileName: doc.image.fileName,
          mimeType: doc.image.mimeType,
          width: doc.image.width || parsed.document.image.width,
          height: doc.image.height || parsed.document.image.height,
        },
      });
      if (parsed.importedCategories.length > 0) {
        setCategories((prev) =>
          mergeCategories(prev, parsed.importedCategories),
        );
      }
      setSelectedPinId(null);
      setIsDirty(true);
      showToast(`Importado: ${file.fileName}`);
    } catch {
      showToast("JSON inválido");
    }
  }, [doc, gateway, showToast]);

  // Global keyboard shortcuts: Ctrl+S, Ctrl+Shift+S, Ctrl+O, Ctrl+Shift+O, [, F, Esc, Delete
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (e.shiftKey) {
          void handleSaveAs();
        } else {
          void handleSave();
        }
      } else if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        if (e.shiftKey) {
          void handleOpenFolder();
        } else {
          void handleOpenSingleImage();
        }
      } else if (e.key === "Escape") {
        setSelectedPinId(null);
      } else if (!typing && e.key === "[" && mode === "author") {
        setNavigatorOpen((v) => !v);
      } else if (!typing && e.key === "]" && selectedPinId) {
        setRightPanelExpanded((v) => !v);
      } else if (!typing && (e.key === "f" || e.key === "F") && selectedPinId) {
        setFocusRequest({ pinId: selectedPinId, nonce: Date.now() });
      } else if (
        !typing &&
        (e.key === "Delete" || e.key === "Backspace") &&
        mode === "author" &&
        selectedPinId
      ) {
        e.preventDefault();
        setDoc((prev) =>
          prev
            ? { ...prev, pins: prev.pins.filter((p) => p.id !== selectedPinId) }
            : prev,
        );
        setSelectedPinId(null);
        setIsDirty(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    handleOpenFolder,
    handleOpenSingleImage,
    handleSave,
    handleSaveAs,
    mode,
    selectedPinId,
  ]);

  const handleImageNaturalSize = useCallback((size: Size2D) => {
    setDoc((prev) => {
      if (!prev) return prev;
      if (prev.image.width === size.width && prev.image.height === size.height) {
        return prev;
      }
      return {
        ...prev,
        image: { ...prev.image, width: size.width, height: size.height },
      };
    });
  }, []);

  const handleCreatePin = useCallback(
    (percent: Point2D) => {
      setDoc((prev) => {
        if (!prev) return prev;
        const pin = createPin(
          {
            x: percent.x,
            y: percent.y,
            categoryId: activeCategoryFilterId ?? "sistemas.esqueletico",
          },
          prev.pins,
        );
        setSelectedPinId(pin.id);
        setRightPanelExpanded(true);
        setAutoFocusPinNonce((n) => n + 1);
        setIsDirty(true);
        return { ...prev, pins: [...prev.pins, pin] };
      });
    },
    [activeCategoryFilterId],
  );

  const handleMovePin = useCallback((pinId: string, percent: Point2D) => {
    setDoc((prev) =>
      prev
        ? {
            ...prev,
            pins: prev.pins.map((p) =>
              p.id === pinId ? { ...p, x: percent.x, y: percent.y } : p,
            ),
          }
        : prev,
    );
    setIsDirty(true);
  }, []);

  const handleUpdatePin = useCallback((pinId: string, patch: Partial<Pin>) => {
    setDoc((prev) =>
      prev
        ? {
            ...prev,
            pins: prev.pins.map((p) =>
              p.id === pinId ? { ...p, ...patch } : p,
            ),
          }
        : prev,
    );
    setIsDirty(true);
  }, []);

  const handleDeletePin = useCallback((pinId: string) => {
    setDoc((prev) =>
      prev
        ? { ...prev, pins: prev.pins.filter((p) => p.id !== pinId) }
        : prev,
    );
    setSelectedPinId((cur) => (cur === pinId ? null : cur));
    setIsDirty(true);
  }, []);

  const handleUpdateTaxonomy = useCallback(
    (patch: Partial<AnatomicalTaxonomy>) => {
      setDoc((prev) =>
        prev ? { ...prev, metadata: { ...prev.metadata, ...patch } } : prev,
      );
      setIsDirty(true);
    },
    [],
  );

  const persistCustomTree = useCallback(
    (nextNodes: CategoryNode[]) => {
      const customOnly = nextNodes.filter((n) => !n.builtIn);
      void gateway.saveCustomCategories(customOnly);
    },
    [gateway],
  );

  const handleAddCategory = useCallback(
    (input: {
      label: string;
      parentId: string | null;
      colorToken: CategoryColorToken | null;
    }) => {
      setCategories((prev) => {
        const { nodes } = addCategory(prev, input);
        persistCustomTree(nodes);
        return nodes;
      });
    },
    [persistCustomTree],
  );

  const handleDeleteCategory = useCallback(
    (id: string) => {
      setCategories((prev) => {
        const { nodes, fallbackCategoryId } = removeCategory(prev, id);
        persistCustomTree(nodes);
        setDoc((curDoc) =>
          curDoc
            ? {
                ...curDoc,
                pins: curDoc.pins.map((p) =>
                  p.categoryId === id
                    ? { ...p, categoryId: fallbackCategoryId }
                    : p,
                ),
              }
            : curDoc,
        );
        return nodes;
      });
    },
    [persistCustomTree],
  );

  const handleToggleCategoryVisibility = useCallback((categoryId: string) => {
    setHiddenCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const visiblePinIds = useMemo(() => {
    if (!doc) return new Set<string>();
    const q = searchQuery.trim().toLowerCase();
    const set = new Set<string>();
    for (const pin of doc.pins) {
      if (isHiddenByAncestors(categories, pin.categoryId, hiddenCategoryIds)) {
        continue;
      }
      if (
        !matchesCategoryFilter(
          categories,
          pin.categoryId,
          activeCategoryFilterId,
        )
      ) {
        continue;
      }
      if (q) {
        const matchesText =
          pin.name.toLowerCase().includes(q) ||
          pin.description.toLowerCase().includes(q) ||
          pin.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesText) continue;
      }
      set.add(pin.id);
    }
    return set;
  }, [activeCategoryFilterId, categories, doc, hiddenCategoryIds, searchQuery]);

  const selectedPin = useMemo(
    () => doc?.pins.find((p) => p.id === selectedPinId) ?? null,
    [doc, selectedPinId],
  );
  const selectedPinIndex = useMemo(() => {
    if (!doc || !selectedPinId) return 0;
    return doc.pins.findIndex((p) => p.id === selectedPinId) + 1;
  }, [doc, selectedPinId]);

  const showAuthorRail = Boolean(doc && imageUrl && mode === "author");

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        const entry = gateway.createEntryFromFile(file);
        if (entry) {
          setFolderName(null);
          setFolderEntries([]);
          void openSpecimenEntry(entry);
        }
      }}
    >
      <TopBar
        mode={mode}
        onModeChange={setMode}
        hasDocument={Boolean(doc && imageUrl)}
        isDirty={isDirty}
        pins={doc?.pins ?? []}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectSearchPin={(pinId) => {
          setSelectedPinId(pinId);
          setRightPanelExpanded(true);
          setFocusRequest({ pinId, nonce: Date.now() });
        }}
        onOpenFolder={() => void handleOpenFolder()}
        onOpenImage={() => void handleOpenSingleImage()}
        onSave={() => void handleSave()}
        onSaveAs={() => void handleSaveAs()}
        onImportJson={() => void handleImportJson()}
        theme={theme}
        onToggleTheme={() => setTheme((cur) => toggleTheme(cur))}
      />

      <main className="relative flex flex-1 overflow-hidden">
        {doc && imageUrl ? (
          <>
            {/* Authoring-Only Retractable 44px <-> 288px Tree Toolbox Rail */}
            {showAuthorRail && (
              <ToolboxNavigator
                expanded={navigatorOpen}
                onToggleExpanded={() => setNavigatorOpen((v) => !v)}
                onExpand={() => setNavigatorOpen(true)}
                folderName={folderName}
                folderEntries={folderEntries}
                activeEntryPath={activeEntry?.path ?? null}
                onSelectEntry={(entry) => void openSpecimenEntry(entry)}
                categories={categories}
                pins={doc.pins}
                selectedPinId={selectedPinId}
                hiddenCategoryIds={hiddenCategoryIds}
                searchQuery={searchQuery}
                taxonomy={doc.metadata}
                onSelectPin={(pinId) => {
                  setSelectedPinId(pinId);
                  setRightPanelExpanded(true);
                }}
                onFocusPin={(pinId) => {
                  setSelectedPinId(pinId);
                  setRightPanelExpanded(true);
                  setFocusRequest({ pinId, nonce: Date.now() });
                }}
                onToggleCategoryVisibility={handleToggleCategoryVisibility}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onUpdateTaxonomy={handleUpdateTaxonomy}
              />
            )}

            {/* Full-Bleed High-FPS Specimen Canvas */}
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <AtlasCanvas
                imageUrl={imageUrl}
                imageAlt={doc.image.fileName}
                pins={doc.pins}
                visiblePinIds={visiblePinIds}
                categories={categories}
                mode={mode}
                selectedPinId={selectedPinId}
                activeCategoryFilterId={activeCategoryFilterId}
                focusRequest={focusRequest}
                rightInsetPx={selectedPin && rightPanelExpanded ? 364 : 0}
                onImageNaturalSize={handleImageNaturalSize}
                onSelectPin={(pinId) => {
                  setSelectedPinId(pinId);
                  if (pinId) setRightPanelExpanded(true);
                }}
                onCreatePin={handleCreatePin}
                onMovePin={handleMovePin}
                onToggleCategoryFilter={setActiveCategoryFilterId}
              />

              {/* Retractable Single Focused Right Floating Card */}
              {selectedPin && (
                <FloatingCard
                  mode={mode}
                  expanded={rightPanelExpanded}
                  onToggleExpanded={() => setRightPanelExpanded((v) => !v)}
                  document={doc}
                  imageUrl={imageUrl}
                  selectedPin={selectedPin}
                  selectedPinIndex={selectedPinIndex}
                  categories={categories}
                  folderEntries={folderEntries}
                  activeEntryPath={activeEntry?.path ?? null}
                  autoFocusPinNameNonce={autoFocusPinNonce}
                  onUpdatePin={handleUpdatePin}
                  onDeletePin={handleDeletePin}
                  onFocusPin={(pinId) =>
                    setFocusRequest({ pinId, nonce: Date.now() })
                  }
                  onSelectSiblingEntry={(entry) => void openSpecimenEntry(entry)}
                  onClose={() => setSelectedPinId(null)}
                />
              )}
            </div>
          </>
        ) : (
          <EmptyState
            isDragging={isDraggingFile}
            onOpenFolder={() => void handleOpenFolder()}
            onOpenImage={() => void handleOpenSingleImage()}
          />
        )}

        {toast && (
          <div
            role="status"
            className="animate-toast-in pointer-events-none absolute bottom-4 left-1/2 z-50 rounded-full px-3.5 py-1.5 text-xs font-medium hud-surface"
            style={{
              color: "var(--color-interest)",
              borderColor: "var(--color-interest-border)",
            }}
          >
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
