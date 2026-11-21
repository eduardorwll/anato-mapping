import {
  ChevronDown,
  Download,
  FolderOpen,
  Image as ImageIcon,
  Save,
  Search,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Pin } from "../packages/annotation-schema/index";
import type { CanvasMode } from "../packages/atlas-canvas/index";
import type { ThemeId } from "../packages/design-tokens/index";
import { AsclepiusLogo } from "./AsclepiusLogo";
import { ThemeSwitch } from "./ThemeSwitch";

interface TopBarProps {
  mode: CanvasMode;
  onModeChange: (mode: CanvasMode) => void;
  hasDocument: boolean;
  isDirty: boolean;
  pins: ReadonlyArray<Pin>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectSearchPin: (pinId: string) => void;
  onOpenFolder: () => void;
  onOpenImage: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onImportJson: () => void;
  theme: ThemeId;
  onToggleTheme: () => void;
}

export function TopBar({
  mode,
  onModeChange,
  hasDocument,
  isDirty,
  pins,
  searchQuery,
  onSearchChange,
  onSelectSearchPin,
  onOpenFolder,
  onOpenImage,
  onSave,
  onSaveAs,
  onImportJson,
  theme,
  onToggleTheme,
}: TopBarProps) {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const unnamedCount = useMemo(
    () => pins.filter((p) => !p.name.trim()).length,
    [pins],
  );

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return pins
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [pins, searchQuery]);

  return (
    <header
      className="relative z-40 flex shrink-0 items-center justify-between gap-3 border-b px-3"
      style={{
        height: "var(--topbar-height)",
        backgroundColor: "var(--color-background)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Cluster 1 & 2: Rod of Asclepius Brand + Arquivo Menu + Sliding Mode Pill */}
      <div className="flex items-center gap-2.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold tracking-tight">
          <span style={{ color: "var(--color-interest)" }}>
            <AsclepiusLogo className="h-4.5 w-4.5" />
          </span>
          Anato Mapping
        </span>

        {/* Consolidated File Dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-expanded={fileMenuOpen}
            onClick={() => setFileMenuOpen((v) => !v)}
            className="btn-tactile inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-medium"
            style={{
              backgroundColor: fileMenuOpen
                ? "var(--color-interest-soft)"
                : "var(--color-muted)",
              color: fileMenuOpen
                ? "var(--color-interest)"
                : "var(--color-foreground)",
              border: fileMenuOpen
                ? "1px solid var(--color-interest-border)"
                : "1px solid var(--color-border)",
            }}
          >
            Arquivo
            <ChevronDown
              className="h-3 w-3 transition-transform duration-200"
              style={{
                transform: fileMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {fileMenuOpen && (
            <div className="animate-popover-down absolute left-0 top-full mt-1 w-44 rounded-xl p-1 text-xs hud-surface">
              <button
                type="button"
                onClick={() => {
                  setFileMenuOpen(false);
                  onOpenFolder();
                }}
                className="btn-tactile flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:opacity-80"
              >
                <FolderOpen className="h-3.5 w-3.5" />
                Abrir Pasta
              </button>
              <button
                type="button"
                onClick={() => {
                  setFileMenuOpen(false);
                  onOpenImage();
                }}
                className="btn-tactile flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:opacity-80"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Abrir Imagem
              </button>

              {hasDocument && (
                <>
                  <div
                    className="my-1 border-t"
                    style={{ borderColor: "var(--color-border)" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFileMenuOpen(false);
                      onImportJson();
                    }}
                    className="btn-tactile flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:opacity-80"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Importar JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFileMenuOpen(false);
                      onSaveAs();
                    }}
                    className="btn-tactile flex w-full cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-left hover:opacity-80"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Salvar como
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Sliding Emerald Mode Switch */}
        {hasDocument && (
          <div
            className="relative grid grid-cols-2 rounded-lg p-0.5"
            style={{
              backgroundColor: "var(--color-muted)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 w-[calc(50%-2px)] rounded-md transition-transform duration-200 ease-out"
              style={{
                backgroundColor: "var(--color-interest)",
                transform:
                  mode === "visualize" ? "translateX(100%)" : "translateX(0%)",
              }}
            />
            <button
              type="button"
              onClick={() => onModeChange("author")}
              className="relative z-10 cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150"
              style={{
                color:
                  mode === "author"
                    ? "var(--color-interest-foreground)"
                    : "var(--color-muted-foreground)",
              }}
            >
              Mapeamento
            </button>
            <button
              type="button"
              onClick={() => onModeChange("visualize")}
              className="relative z-10 cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150"
              style={{
                color:
                  mode === "visualize"
                    ? "var(--color-interest-foreground)"
                    : "var(--color-muted-foreground)",
              }}
            >
              Visualização
            </button>
          </div>
        )}
      </div>

      {/* Cluster 3: Instant Search */}
      {hasDocument && (
        <div className="relative max-w-sm flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
            style={{ color: "var(--color-muted-foreground)" }}
          />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchMatches[0]) {
                onSelectSearchPin(searchMatches[0].id);
                setSearchFocused(false);
              }
            }}
            placeholder="Buscar..."
            aria-label="Buscar pins"
            className="h-7 w-full rounded-lg pl-8 pr-7 text-xs focus:outline-none"
            style={{
              backgroundColor: "var(--color-muted)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => onSearchChange("")}
              className="btn-tactile absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              <X className="h-3 w-3" />
            </button>
          )}

          {searchFocused && searchMatches.length > 0 && (
            <div className="animate-popover-down absolute left-0 right-0 top-full mt-1 overflow-hidden rounded-xl p-1 text-xs hud-surface">
              {searchMatches.map((pin) => (
                <button
                  key={pin.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectSearchPin(pin.id);
                    setSearchFocused(false);
                  }}
                  className="btn-tactile flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left hover:opacity-90"
                  style={{ color: "var(--color-foreground)" }}
                >
                  <span className="truncate font-medium">
                    {pin.name || pin.id}
                  </span>
                  <span
                    className="ml-2 font-mono text-[10px]"
                    style={{ color: "var(--color-muted-foreground)" }}
                  >
                    {pin.x.toFixed(1)}%, {pin.y.toFixed(1)}%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cluster 4: Count + Save + Theme Slider */}
      <div className="flex items-center gap-2">
        {hasDocument && (
          <>
            <span
              className="hidden items-center gap-1.5 font-mono text-[11px] md:inline-flex"
              style={{ color: "var(--color-muted-foreground)" }}
            >
              <strong style={{ color: "var(--color-foreground)" }}>
                {pins.length}
              </strong>{" "}
              pins
              {unnamedCount > 0 && (
                <>
                  <span>·</span>
                  <span>{unnamedCount} sem nome</span>
                </>
              )}
            </span>

            <button
              type="button"
              onClick={onSave}
              title={isDirty ? "Salvar alterações (Ctrl+S)" : "Salvar (Ctrl+S)"}
              className="btn-tactile relative inline-flex h-7 cursor-pointer items-center gap-1 rounded-lg px-2.5 text-xs font-medium hover:opacity-90"
              style={{
                backgroundColor: "var(--color-interest)",
                color: "var(--color-interest-foreground)",
              }}
            >
              <Save className="h-3.5 w-3.5" />
              Salvar
              {isDirty && (
                <span
                  aria-hidden="true"
                  className="ml-0.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: "currentColor" }}
                />
              )}
            </button>
          </>
        )}

        <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
