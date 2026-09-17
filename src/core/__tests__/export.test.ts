import { describe, expect, it } from "vitest";
import { toCsv, toMarkdown, toTxt } from "../export";
import type { TabRecord } from "../../types";

const sampleTabs: TabRecord[] = [
  {
    title: "Example Site",
    url: "https://example.com",
    timestamp: "2026-09-17T00:00:00.000Z",
    summary: "An example website used for testing.",
  },
  {
    title: 'Has, comma "and quotes"',
    url: "https://example.org/page",
    timestamp: "2026-09-17T00:01:00.000Z",
    summary: "",
  },
];

describe("toTxt", () => {
  it("formats each tab as 'title - url' separated by newlines", () => {
    const result = toTxt(sampleTabs);
    expect(result).toBe(
      'Example Site - https://example.com\nHas, comma "and quotes" - https://example.org/page'
    );
  });

  it("returns an empty string for an empty list", () => {
    expect(toTxt([])).toBe("");
  });
});

describe("toCsv", () => {
  it("starts with a UTF-8 BOM and the correct header", () => {
    const result = toCsv(sampleTabs);
    expect(result.startsWith("\uFEFFTitle,URL,Time,Summary")).toBe(true);
  });

  it("escapes embedded quotes by doubling them and wraps every field in quotes", () => {
    const result = toCsv(sampleTabs);
    const rows = result.split("\n");
    // Second data row corresponds to sampleTabs[1], whose title contains a comma and quotes
    expect(rows[2]).toBe(
      '"Has, comma ""and quotes""","https://example.org/page","2026-09-17T00:01:00.000Z",""'
    );
  });

  it("produces one header row plus one row per tab", () => {
    const result = toCsv(sampleTabs);
    expect(result.split("\n")).toHaveLength(sampleTabs.length + 1);
  });
});

describe("toMarkdown", () => {
  it("includes the export timestamp and a markdown link per tab", () => {
    const result = toMarkdown(sampleTabs, "2026-09-17T12:00:00.000Z");
    expect(result).toContain("匯出時間：2026-09-17T12:00:00.000Z");
    expect(result).toContain("[Example Site](https://example.com)");
  });

  it("appends the summary as a blockquote when present", () => {
    const result = toMarkdown(sampleTabs, "2026-09-17T12:00:00.000Z");
    expect(result).toContain("> An example website used for testing.");
  });

  it("escapes square brackets in titles so links are not broken", () => {
    const withBrackets: TabRecord[] = [
      { title: "[Draft] Report", url: "https://example.com/draft", timestamp: "t", summary: "" },
    ];
    const result = toMarkdown(withBrackets, "2026-09-17T12:00:00.000Z");
    expect(result).toContain("[﹙Draft﹚ Report](https://example.com/draft)");
  });
});
