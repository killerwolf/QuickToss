import type { FileItem } from "./ipc-types";

// Extensions are compared lowercase; callers normalize before looking up.
export const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".bmp",
  ".tiff",
] as const;

export const DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".rtf",
  ".md",
  ".log",
  ".json",
  ".xml",
  ".csv",
  ".yaml",
  ".yml",
  ".doc",
  ".docx",
] as const;

export const VIDEO_EXTENSIONS = [".mp4", ".mov", ".avi"] as const;

// Derived from the category lists rather than maintained separately, so an
// extension can't be scannable without also having a type (or vice versa).
export const SUPPORTED_EXTENSIONS: readonly string[] = [
  ...IMAGE_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
];

export function getFileType(extension: string): FileItem["type"] {
  const ext = extension.toLowerCase();
  if ((IMAGE_EXTENSIONS as readonly string[]).includes(ext)) return "image";
  if ((DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) return "document";
  if ((VIDEO_EXTENSIONS as readonly string[]).includes(ext)) return "video";
  return "other";
}

export function isSupportedExtension(extension: string): boolean {
  return SUPPORTED_EXTENSIONS.includes(extension.toLowerCase());
}
