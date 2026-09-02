import { mkdir, mkdtemp, rm, utimes, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileExists, getFileStats, readFileAsBuffer, scanFolder } from "./file-operations";

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "quicktoss-file-operations-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("scanFolder", () => {
  it("returns supported files, sorted newest-modified first", async () => {
    await writeFile(join(dir, "older.txt"), "older");
    await utimes(join(dir, "older.txt"), new Date("2024-01-01"), new Date("2024-01-01"));
    await writeFile(join(dir, "newer.png"), "newer");
    await utimes(join(dir, "newer.png"), new Date("2024-06-01"), new Date("2024-06-01"));

    const files = await scanFolder(dir);

    expect(files.map((f) => f.name)).toEqual(["newer.png", "older.txt"]);
    expect(files[0].type).toBe("image");
    expect(files[1].type).toBe("document");
  });

  it("filters out unsupported extensions", async () => {
    await writeFile(join(dir, "supported.jpg"), "x");
    await writeFile(join(dir, "unsupported.exe"), "x");

    const files = await scanFolder(dir);

    expect(files.map((f) => f.name)).toEqual(["supported.jpg"]);
  });

  it("filters out subdirectories", async () => {
    await mkdir(join(dir, "a-folder.pdf"));
    await writeFile(join(dir, "a-file.pdf"), "x");

    const files = await scanFolder(dir);

    expect(files.map((f) => f.name)).toEqual(["a-file.pdf"]);
  });

  it("rejects when the folder does not exist", async () => {
    await expect(scanFolder(join(dir, "does-not-exist"))).rejects.toThrow();
  });
});

describe("getFileStats", () => {
  it("returns size, modified, and created for an existing file", async () => {
    const path = join(dir, "file.txt");
    await writeFile(path, "hello");

    const stats = await getFileStats(path);

    expect(stats?.size).toBe(5);
    expect(stats?.modified).toBeInstanceOf(Date);
    expect(stats?.created).toBeInstanceOf(Date);
  });

  it("returns null for a file that does not exist", async () => {
    const stats = await getFileStats(join(dir, "missing.txt"));
    expect(stats).toBeNull();
  });
});

describe("fileExists", () => {
  it("is true for an existing file", async () => {
    const path = join(dir, "file.txt");
    await writeFile(path, "hello");
    expect(await fileExists(path)).toBe(true);
  });

  it("is false for a missing file", async () => {
    expect(await fileExists(join(dir, "missing.txt"))).toBe(false);
  });
});

describe("readFileAsBuffer", () => {
  it("returns the file's bytes as an ArrayBuffer", async () => {
    const path = join(dir, "file.txt");
    await writeFile(path, "hello");

    const buffer = await readFileAsBuffer(path);

    expect(Buffer.from(buffer).toString("utf8")).toBe("hello");
  });

  it("rejects for a file that does not exist", async () => {
    await expect(readFileAsBuffer(join(dir, "missing.txt"))).rejects.toThrow();
  });
});
