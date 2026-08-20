import { describe, expect, it } from "vitest";
import {
  DOCUMENT_EXTENSIONS,
  getFileType,
  IMAGE_EXTENSIONS,
  isSupportedExtension,
  SUPPORTED_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from "./file-types";

describe("getFileType", () => {
  it("classifies images", () => {
    expect(getFileType(".png")).toBe("image");
    expect(getFileType(".heic")).toBe("image");
  });

  it("classifies documents", () => {
    expect(getFileType(".pdf")).toBe("document");
    expect(getFileType(".docx")).toBe("document");
  });

  it("classifies video", () => {
    expect(getFileType(".mp4")).toBe("video");
  });

  it("falls back to 'other' for unknown extensions", () => {
    expect(getFileType(".exe")).toBe("other");
    expect(getFileType("")).toBe("other");
  });

  it("is case-insensitive", () => {
    // Files off a camera or a FAT volume often come back uppercase, and
    // scanFolder is not the only caller.
    expect(getFileType(".PNG")).toBe("image");
    expect(getFileType(".JPEG")).toBe("image");
    expect(getFileType(".PDF")).toBe("document");
  });
});

describe("isSupportedExtension", () => {
  it("accepts a supported extension", () => {
    expect(isSupportedExtension(".jpg")).toBe(true);
  });

  it("rejects an unsupported one", () => {
    expect(isSupportedExtension(".exe")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isSupportedExtension(".JPG")).toBe(true);
  });
});

describe("extension lists", () => {
  it("gives every scannable extension a type", () => {
    // Guards the pairing: an extension that is scanned but lands in "other"
    // would show up in the app with no preview and no icon category.
    for (const extension of SUPPORTED_EXTENSIONS) {
      expect(getFileType(extension), `${extension} should have a type`).not.toBe("other");
    }
  });

  it("does not repeat an extension across categories", () => {
    const all = [...IMAGE_EXTENSIONS, ...DOCUMENT_EXTENSIONS, ...VIDEO_EXTENSIONS];
    expect(new Set(all).size).toBe(all.length);
  });

  it("stores extensions lowercase and dot-prefixed", () => {
    for (const extension of SUPPORTED_EXTENSIONS) {
      expect(extension).toBe(extension.toLowerCase());
      expect(extension.startsWith(".")).toBe(true);
    }
  });
});
