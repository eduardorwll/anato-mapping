import { Check, Copy, Crosshair, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnnotationDocumentV1,
  Pin,
} from "../packages/annotation-schema/index";
import type { CanvasMode } from "../packages/atlas-canvas/index";
import {
  type CategoryNode,
  flattenTreeForDisplay,
  getAncestorChain,
  resolveCategoryColorToken,
} from "../packages/category-tree/index";
import { cssVarForToken } from "../packages/design-tokens/index";
import {
  clampPercent,
  computePinCropProjection,
} from "../packages/viewport-math/index";
import type { WorkspaceImageEntry } from "../packages/workspace-gateway/index";
import { ThreeBarToggle } from "./ThreeBarToggle";

interface FloatingCardProps {
  mode: CanvasMode;
  expanded: boolean;
  onToggleExpanded: () => void;
  document: AnnotationDocumentV1;
  imageUrl: string;
  selectedPin: Pin;
  selectedPinIndex: number;
  categories: ReadonlyArray<CategoryNode>;
  folderEntries: ReadonlyArray<WorkspaceImageEntry>;
  activeEntryPath: string | null;
  autoFocusPinNameNonce: number;
  onUpdatePin: (pinId: string, patch: Partial<Pin>) => void;
  onDeletePin: (pinId: string) => void;
  onFocusPin: (pinId: string) => void;
  onSelectSiblingEntry: (entry: WorkspaceImageEntry) => void;
  onClose: () => void;
}

export function FloatingCard({
  mode,
  expanded,
  onToggleExpanded,
  document: doc,
  imageUrl,
  selectedPin,
  selectedPinIndex,
  categories,
  folderEntries,
  activeEntryPath,
  autoFocusPinNameNonce,
  onUpdatePin,
  onDeletePin,
  onFocusPin,
  onSelectSiblingEntry,
  onClose,
}: FloatingCardProps) {
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [copiedKey, setCopiedKey] = useState<"citation" | "json" | null>(null);

  useEffect(() => {
    if (mode === "author" && expanded) {
      nameInputRef.current?.focus();
    }
  }, [autoFocusPinNameNonce, expanded, mode, selectedPin.id]);

  const flatCategories = useMemo(
    () => flattenTreeForDisplay(categories),
    [categories],
  );

  const categoryTrail = useMemo(() => {
    if (!selectedPin.categoryId) return [];
    return getAncestorChain(categories, selectedPin.categoryId);
  }, [categories, selectedPin.categoryId]);

  const categoryColorToken = resolveCategoryColorToken(
    categories,
    selectedPin.categoryId,
  );

  const copyText = async (key: "citation" | "json", text: string) => {
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // Clipboard may be unavailable in headless tests.
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 1400);
  };

  // Single persistent 3-bar toggle pinned at exact top-right coordinate so
  // expanding <-> retracting morphs in place with zero cursor travel.
  const retractToggle = (
    <div
      data-testid="right-panel-toggle-wrap"
      className={`pointer-events-auto absolute right-6 top-5 z-40 rounded-xl transition-all duration-200 ${
        expanded ? "" : "p-1 hud-surface"
      }`}
    >
      <div className="relative">
        <ThreeBarToggle
          direction="right"
          expanded={expanded}
          onToggle={onToggleExpanded}
          label="Painel do pin"
          shortcutHint="]"
        />
        {!expanded && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-0.5 -top-0.5 h-2 w-2 rounded-full"
            style={{
              backgroundColor: cssVarForToken(categoryColorToken),
              border: "1.5px solid var(--color-card-solid)",
            }}
          />
        )}
      </div>
    </div>
  );

  // VISUALIZATION MODE (Screenshot 1 Detail Card)
  if (mode === "visualize") {
    const crop = computePinCropProjection(
      { x: selectedPin.x, y: selectedPin.y },
      2.2,
      doc.image.width > 0 && doc.image.height > 0
        ? { width: doc.image.width, height: doc.image.height }
        : undefined,
    );
    const effectiveBib =
      selectedPin.bibliography.trim() || doc.metadata.bibliography.trim();
    const siblingViews = folderEntries.filter(
      (e) => e.path !== activeEntryPath,
    );

    const metadataRows: Array<[string, string]> = [];
    if (doc.metadata.system) metadataRows.push(["Sistema", doc.metadata.system]);
    if (doc.metadata.region) metadataRows.push(["Região", doc.metadata.region]);
    if (doc.metadata.structure)
      metadataRows.push(["Estrutura", doc.metadata.structure]);
    if (doc.metadata.view) metadataRows.push(["Vista", doc.metadata.view]);
    metadataRows.push([
      "Posição",
      `X ${selectedPin.x.toFixed(2)}% · Y ${selectedPin.y.toFixed(2)}%`,
    ]);
    metadataRows.push([
      "Arquivo",
      doc.image.width > 0
        ? `${doc.image.fileName} (${doc.image.width}×${doc.image.height})`
        : doc.image.fileName,
    ]);

    const citationText = [
      selectedPin.name || `Pin #${selectedPinIndex}`,
      doc.metadata.structure,
      effectiveBib,
    ]
      .filter(Boolean)
      .join(" — ");

    return (
      <>
        {retractToggle}
        <aside
          aria-label="Detalhes do pin"
          aria-hidden={!expanded}
          data-testid="visualization-detail-card"
          data-expanded={expanded ? "true" : "false"}
          className="right-floating-panel pointer-events-auto absolute bottom-4 right-4 top-3 z-30 flex flex-col overflow-hidden rounded-2xl hud-surface"
          style={{ width: "var(--hud-card-width)" }}
        >
          <div className="flex items-start justify-between gap-2 py-3.5 pl-4 pr-11">
            <div className="min-w-0">
              <div
                className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: cssVarForToken(categoryColorToken) }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: cssVarForToken(categoryColorToken),
                  }}
                />
                <span className="truncate">
                  {categoryTrail.length > 0
                    ? categoryTrail.map((n) => n.label).join(" › ")
                    : "Pin"}{" "}
                  · #{String(selectedPinIndex).padStart(2, "0")}
                </span>
              </div>
              <h2 className="mt-1 truncate text-base font-semibold leading-snug">
                {selectedPin.name || `Pin #${selectedPinIndex}`}
              </h2>
            </div>
            <button
              type="button"
              aria-label="Fechar detalhes"
              onClick={onClose}
              className="btn-tactile cursor-pointer rounded-lg p-1 hover:opacity-80"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3.5 overflow-y-auto px-4 pb-4">
            <div
              data-testid="pin-crop-preview"
              className="relative h-40 w-full overflow-hidden rounded-xl border"
              style={{
                backgroundColor: "var(--color-canvas)",
                borderColor: "var(--color-border)",
              }}
            >
              <img
                src={imageUrl}
                alt={selectedPin.name || doc.image.fileName}
                draggable={false}
                className="pointer-events-none absolute left-1/2 top-1/2 block h-auto max-w-none select-none"
                style={{
                  width: `${crop.widthPercent}%`,
                  transform: `translate(${crop.translateXPercent}%, ${crop.translateYPercent}%)`,
                }}
              />
              <span
                className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  backgroundColor: cssVarForToken(categoryColorToken),
                  border: "2px solid var(--pin-ring-color)",
                  boxShadow: "0 0 0 3px var(--pin-selected-halo)",
                }}
              />
            </div>

            {selectedPin.description.trim() && (
              <p className="text-xs leading-relaxed">
                {selectedPin.description}
              </p>
            )}

            {selectedPin.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedPin.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md px-2 py-0.5 text-[11px]"
                    style={{
                      backgroundColor: "var(--color-muted)",
                      color: "var(--color-muted-foreground)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <dl
              className="grid grid-cols-[88px_1fr] gap-y-1.5 border-t pt-3 text-xs"
              style={{ borderColor: "var(--color-border)" }}
            >
              {metadataRows.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt style={{ color: "var(--color-muted-foreground)" }}>
                    {k}
                  </dt>
                  <dd className="truncate font-mono text-[11px]">{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => copyText("citation", citationText)}
                className="btn-tactile inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: "var(--color-muted)",
                  color: "var(--color-foreground)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {copiedKey === "citation" ? (
                  <Check
                    className="h-3.5 w-3.5"
                    style={{ color: "var(--color-interest)" }}
                  />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                Citação
              </button>
              <button
                type="button"
                onClick={() =>
                  copyText("json", JSON.stringify(selectedPin, null, 2))
                }
                className="btn-tactile inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: "var(--color-muted)",
                  color: "var(--color-foreground)",
                  border: "1px solid var(--color-border)",
                }}
              >
                {copiedKey === "json" ? (
                  <Check
                    className="h-3.5 w-3.5"
                    style={{ color: "var(--color-interest)" }}
                  />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                JSON
              </button>
              <button
                type="button"
                onClick={() => onFocusPin(selectedPin.id)}
                className="btn-tactile inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: "var(--color-interest-soft)",
                  color: "var(--color-interest)",
                  border: "1px solid var(--color-interest-border)",
                }}
              >
                <Crosshair className="h-3.5 w-3.5" />
                Focar
              </button>
            </div>

            {effectiveBib && (
              <div
                className="border-t pt-3"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div
                  className="mb-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  Bibliografia
                </div>
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {effectiveBib}
                </p>
              </div>
            )}

            {siblingViews.length > 0 && (
              <div
                className="border-t pt-3"
                style={{ borderColor: "var(--color-border)" }}
              >
                <div
                  className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  Outras vistas
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {siblingViews.slice(0, 6).map((entry) => (
                    <button
                      key={entry.path}
                      type="button"
                      onClick={() => onSelectSiblingEntry(entry)}
                      className="btn-tactile max-w-full cursor-pointer truncate rounded-lg px-2 py-1 text-[11px]"
                      style={{
                        backgroundColor: "var(--color-muted)",
                        color: "var(--color-foreground)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      {entry.fileName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </>
    );
  }

  // AUTHORING MODE — Pure Pin Editor Card
  return (
    <>
      {retractToggle}
      <aside
        aria-label="Editor do pin"
        aria-hidden={!expanded}
        data-testid="authoring-inspector-card"
        data-expanded={expanded ? "true" : "false"}
        className="right-floating-panel pointer-events-auto absolute bottom-4 right-4 top-3 z-30 flex flex-col overflow-hidden rounded-2xl hud-surface"
        style={{ width: "var(--hud-card-width)" }}
      >
        <div
          className="flex items-center justify-between border-b py-2.5 pl-4 pr-11"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span
            className="flex items-center gap-1.5 font-mono text-xs font-semibold"
            style={{ color: cssVarForToken(categoryColorToken) }}
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: cssVarForToken(categoryColorToken) }}
            />
            #{String(selectedPinIndex).padStart(2, "0")}
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Focar pin"
              title="Focar (F)"
              onClick={() => onFocusPin(selectedPin.id)}
              className="btn-tactile cursor-pointer rounded-md p-1.5 hover:opacity-80"
              style={{ color: "var(--color-interest)" }}
            >
              <Crosshair className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Excluir pin"
              title="Excluir"
              onClick={() => onDeletePin(selectedPin.id)}
              className="btn-tactile cursor-pointer rounded-md p-1.5 hover:opacity-80"
              style={{ color: "var(--color-destructive)" }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Fechar inspetor"
              title="Desmarcar (Esc)"
              onClick={onClose}
              className="btn-tactile cursor-pointer rounded-md p-1.5 hover:opacity-80"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-xs">
          <label className="block space-y-1">
            <span style={{ color: "var(--color-muted-foreground)" }}>Nome</span>
            <input
              ref={nameInputRef}
              type="text"
              aria-label="Nome do pin"
              value={selectedPin.name}
              onChange={(e) =>
                onUpdatePin(selectedPin.id, { name: e.target.value })
              }
              placeholder="Nome"
              className="w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: "var(--color-muted)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
              }}
            />
          </label>

          <label className="block space-y-1">
            <span style={{ color: "var(--color-muted-foreground)" }}>
              Categoria
            </span>
            <select
              aria-label="Categoria do pin"
              value={selectedPin.categoryId ?? ""}
              onChange={(e) =>
                onUpdatePin(selectedPin.id, {
                  categoryId: e.target.value || null,
                })
              }
              className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: "var(--color-muted)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
              }}
            >
              <option value="">Sem categoria</option>
              {flatCategories.map((item) => (
                <option key={item.node.id} value={item.node.id}>
                  {"— ".repeat(item.depth)}
                  {item.node.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span style={{ color: "var(--color-muted-foreground)" }}>
              Descrição
            </span>
            <textarea
              aria-label="Descrição do pin"
              rows={4}
              value={selectedPin.description}
              onChange={(e) =>
                onUpdatePin(selectedPin.id, { description: e.target.value })
              }
              placeholder="Descrição"
              className="w-full resize-none rounded-lg px-3 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: "var(--color-muted)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
              }}
            />
          </label>

          <label className="block space-y-1">
            <span style={{ color: "var(--color-muted-foreground)" }}>Tags</span>
            <input
              type="text"
              aria-label="Tags do pin"
              value={selectedPin.tags.join(", ")}
              onChange={(e) =>
                onUpdatePin(selectedPin.id, {
                  tags: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="tag1, tag2"
              className="w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: "var(--color-muted)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
              }}
            />
          </label>

          <label className="block space-y-1">
            <span style={{ color: "var(--color-muted-foreground)" }}>
              Bibliografia
            </span>
            <input
              type="text"
              aria-label="Bibliografia do pin"
              value={selectedPin.bibliography}
              onChange={(e) =>
                onUpdatePin(selectedPin.id, { bibliography: e.target.value })
              }
              placeholder="Bibliografia"
              className="w-full rounded-lg px-3 py-1.5 text-xs focus:outline-none"
              style={{
                backgroundColor: "var(--color-muted)",
                color: "var(--color-foreground)",
                border: "1px solid var(--color-border)",
              }}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1">
              <span style={{ color: "var(--color-muted-foreground)" }}>
                X (%)
              </span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                aria-label="Coordenada X"
                value={selectedPin.x}
                onChange={(e) =>
                  onUpdatePin(selectedPin.id, {
                    x: clampPercent(Number(e.target.value)),
                  })
                }
                className="w-full rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none"
                style={{
                  backgroundColor: "var(--color-muted)",
                  color: "var(--color-foreground)",
                  border: "1px solid var(--color-border)",
                }}
              />
            </label>
            <label className="block space-y-1">
              <span style={{ color: "var(--color-muted-foreground)" }}>
                Y (%)
              </span>
              <input
                type="number"
                step="0.01"
                min={0}
                max={100}
                aria-label="Coordenada Y"
                value={selectedPin.y}
                onChange={(e) =>
                  onUpdatePin(selectedPin.id, {
                    y: clampPercent(Number(e.target.value)),
                  })
                }
                className="w-full rounded-lg px-2.5 py-1.5 font-mono text-xs focus:outline-none"
                style={{
                  backgroundColor: "var(--color-muted)",
                  color: "var(--color-foreground)",
                  border: "1px solid var(--color-border)",
                }}
              />
            </label>
          </div>
        </div>
      </aside>
    </>
  );
}
