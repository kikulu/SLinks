import { describe, expect, it } from "vitest";
import { isRestrictedUrl, tabToUploadable, truncateTitle } from "../tabs";

describe("isRestrictedUrl", () => {
  it("treats missing url as restricted", () => {
    expect(isRestrictedUrl(undefined)).toBe(true);
  });

  it.each(["chrome://extensions", "chrome-extension://abc123/options.html", "edge://settings"])(
    "treats %s as restricted",
    (url) => {
      expect(isRestrictedUrl(url)).toBe(true);
    }
  );

  it.each(["https://example.com", "http://example.com/page"])(
    "treats %s as not restricted",
    (url) => {
      expect(isRestrictedUrl(url)).toBe(false);
    }
  );
});

describe("truncateTitle", () => {
  it("returns the title unchanged when shorter than the limit", () => {
    expect(truncateTitle("short title")).toBe("short title");
  });

  it("truncates and appends an ellipsis when longer than the default limit (40)", () => {
    const longTitle = "a".repeat(50);
    const result = truncateTitle(longTitle);
    expect(result).toBe(`${"a".repeat(40)}...`);
  });

  it("respects a custom max length", () => {
    expect(truncateTitle("abcdefghij", 5)).toBe("abcde...");
  });
});

describe("tabToUploadable", () => {
  it("maps a chrome.tabs.Tab into an UploadableTab", () => {
    const tab = { title: "Example", url: "https://example.com" } as chrome.tabs.Tab;
    const result = tabToUploadable(tab, "2026-09-17T00:00:00.000Z");
    expect(result).toEqual({
      title: "Example",
      url: "https://example.com",
      timestamp: "2026-09-17T00:00:00.000Z",
    });
  });

  it("falls back to the url as title, and empty string url, when fields are missing", () => {
    const tab = {} as chrome.tabs.Tab;
    const result = tabToUploadable(tab, "t");
    expect(result).toEqual({ title: "無標題", url: "", timestamp: "t" });
  });
});
