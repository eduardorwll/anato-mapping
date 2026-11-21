export const SUPPORTED_IMAGE_EXTENSIONS = [
  "png",
  "jpg",
  "jpeg",
  "webp",
  "avif",
  "bmp",
  "gif",
  "svg",
] as const;

export type SupportedImageExtension =
  (typeof SUPPORTED_IMAGE_EXTENSIONS)[number];

const MIME_BY_EXT: Record<SupportedImageExtension, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
  bmp: "image/bmp",
  gif: "image/gif",
  svg: "image/svg+xml",
};

const EXT_SET = new Set<string>(SUPPORTED_IMAGE_EXTENSIONS);

export const IMAGE_ACCEPT_ATTRIBUTE =
  SUPPORTED_IMAGE_EXTENSIONS.map((ext) => `.${ext}`).join(",") + ",image/*";

export function extractBaseName(pathOrName: string): string {
  const normalized = pathOrName.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
}

export function getImageExtension(
  fileName: string,
): SupportedImageExtension | null {
  const base = extractBaseName(fileName);
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  return EXT_SET.has(ext) ? (ext as SupportedImageExtension) : null;
}

export function isSupportedImageFile(fileName: string): boolean {
  return getImageExtension(fileName) !== null;
}

export function getMimeTypeForFile(fileName: string): string {
  const ext = getImageExtension(fileName);
  return ext ? MIME_BY_EXT[ext] : "application/octet-stream";
}

export function getFormatBadge(fileName: string): string {
  const ext = getImageExtension(fileName);
  if (!ext) return "IMG";
  return ext === "jpeg" ? "JPG" : ext.toUpperCase();
}

export function deriveJsonFileName(imageFileName: string): string {
  const base = extractBaseName(imageFileName).trim();
  const dot = base.lastIndexOf(".");
  const rawStem = dot > 0 ? base.slice(0, dot) : base;
  const safeStem =
    rawStem
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .replace(/\.+$/g, "")
      .trim() || "anotacao";
  return `${safeStem}.json`;
}
