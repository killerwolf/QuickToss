import { describe, expect, it } from "vitest";
import { formatDate, formatFileSize } from "./types";

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(1023)).toBe("1023 B");
  });

  it("steps up through the units", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1024 ** 2)).toBe("1 MB");
    expect(formatFileSize(1024 ** 3)).toBe("1 GB");
  });

  it("handles sizes of a terabyte and beyond", () => {
    // Regression: these used to render as "1 undefined" — the unit array
    // stopped at GB and the index ran off the end.
    expect(formatFileSize(1024 ** 4)).toBe("1 TB");
    expect(formatFileSize(5 * 1024 ** 4)).toBe("5 TB");
    expect(formatFileSize(1024 ** 5)).toBe("1024 TB");
  });

  it("does not produce NaN for nonsense input", () => {
    expect(formatFileSize(-100)).toBe("0 B");
    expect(formatFileSize(Number.NaN)).toBe("0 B");
    expect(formatFileSize(Number.POSITIVE_INFINITY)).toBe("0 B");
  });

  it("rounds to two decimals", () => {
    expect(formatFileSize(1234)).toBe("1.21 KB");
  });
});

describe("formatDate", () => {
  it("formats a Date", () => {
    const formatted = formatDate(new Date("2026-03-15T14:30:00Z"));
    expect(formatted).toMatch(/Mar/);
    expect(formatted).toMatch(/2026/);
  });

  it("accepts a date that arrived over IPC as a string", () => {
    // Dates lose their prototype crossing the IPC boundary, so formatDate is
    // routinely handed a string despite its Date signature.
    const formatted = formatDate("2026-03-15T14:30:00Z" as unknown as Date);
    expect(formatted).toMatch(/Mar/);
    expect(formatted).toMatch(/2026/);
  });
});
