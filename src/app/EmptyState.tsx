import { FolderOpen, Image as ImageIcon } from "lucide-react";
import { SUPPORTED_IMAGE_EXTENSIONS } from "../packages/annotation-schema/formats";

interface EmptyStateProps {
  isDragging: boolean;
  onOpenFolder: () => void;
  onOpenImage: () => void;
}

const DISPLAY_FORMATS = SUPPORTED_IMAGE_EXTENSIONS.filter(
  (ext) => ext !== "jpeg",
).map((ext) => ext.toUpperCase());

export function EmptyState({
  isDragging,
  onOpenFolder,
  onOpenImage,
}: EmptyStateProps) {
  return (
    <div
      className="flex h-full w-full items-center justify-center p-6"
      style={{ backgroundColor: "var(--color-canvas)" }}
    >
      <div
        className="flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border-2 border-dashed p-8 transition-colors"
        style={{
          backgroundColor: isDragging
            ? "var(--color-interest-soft)"
            : "var(--color-card)",
          borderColor: isDragging
            ? "var(--color-interest)"
            : "var(--color-border-strong)",
        }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{
            backgroundColor: "var(--color-interest-soft)",
            color: "var(--color-interest)",
            border: "1px solid var(--color-interest-border)",
          }}
        >
          <ImageIcon className="h-6 w-6" />
        </div>

        <div className="flex w-full gap-2.5">
          <button
            type="button"
            onClick={onOpenFolder}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              backgroundColor: "var(--color-interest)",
              color: "var(--color-interest-foreground)",
            }}
          >
            <FolderOpen className="h-4 w-4" />
            Abrir Pasta
          </button>

          <button
            type="button"
            onClick={onOpenImage}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--color-muted)",
              color: "var(--color-foreground)",
              border: "1px solid var(--color-border)",
            }}
          >
            <ImageIcon className="h-4 w-4" />
            Abrir Imagem
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {DISPLAY_FORMATS.map((fmt) => (
            <span
              key={fmt}
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium"
              style={{
                backgroundColor: "var(--color-muted)",
                color: "var(--color-muted-foreground)",
              }}
            >
              {fmt}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
