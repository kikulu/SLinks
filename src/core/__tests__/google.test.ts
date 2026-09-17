import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadableTab } from "../../types";

function createChromeMock(options: {
  redirectUrl?: string | undefined;
  lastErrorMessage?: string;
}) {
  const syncStore: Record<string, unknown> = {};

  return {
    runtime: {
      id: "test-extension-id",
      get lastError() {
        return options.lastErrorMessage ? { message: options.lastErrorMessage } : undefined;
      },
    },
    identity: {
      launchWebAuthFlow: vi.fn((_details: unknown, callback: (redirectUrl?: string) => void) => {
        callback(options.redirectUrl);
      }),
    },
    storage: {
      sync: {
        get: vi.fn((key: string) => Promise.resolve({ [key]: syncStore[key] })),
        set: vi.fn((items: Record<string, unknown>) => {
          Object.assign(syncStore, items);
          return Promise.resolve();
        }),
        remove: vi.fn((key: string) => {
          delete syncStore[key];
          return Promise.resolve();
        }),
      },
    },
  };
}

describe("core/google", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("authenticateWithGoogle", () => {
    it("resolves with the access token parsed from the redirect URL and persists it", async () => {
      vi.stubGlobal(
        "chrome",
        createChromeMock({
          redirectUrl:
            "https://test-extension-id.chromiumapp.org/#access_token=abc123&token_type=Bearer",
        })
      );
      const { authenticateWithGoogle } = await import("../google");
      const { getAccessToken } = await import("../storage");

      const token = await authenticateWithGoogle();

      expect(token).toBe("abc123");
      expect(await getAccessToken()).toBe("abc123");
    });

    it("rejects when the auth flow returns no redirect URL", async () => {
      vi.stubGlobal(
        "chrome",
        createChromeMock({ redirectUrl: undefined, lastErrorMessage: "user closed the window" })
      );
      const { authenticateWithGoogle } = await import("../google");

      await expect(authenticateWithGoogle()).rejects.toThrow("user closed the window");
    });
  });

  describe("uploadToGoogleDrive", () => {
    it("throws when no access token has been stored", async () => {
      vi.stubGlobal("chrome", createChromeMock({}));
      const { uploadToGoogleDrive } = await import("../google");

      await expect(uploadToGoogleDrive(["https://example.com"])).rejects.toThrow("尚未登入 Google");
    });

    it("calls the Drive upload endpoint with a bearer token when authenticated", async () => {
      vi.stubGlobal("chrome", createChromeMock({}));
      const { setAccessToken } = await import("../storage");
      await setAccessToken("token-xyz");

      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal("fetch", fetchMock);

      const { uploadToGoogleDrive } = await import("../google");
      await uploadToGoogleDrive(["https://example.com"]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("www.googleapis.com/upload/drive/v3/files");
      expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-xyz");
    });

    it("throws a descriptive error when the API responds with a non-ok status", async () => {
      vi.stubGlobal("chrome", createChromeMock({}));
      const { setAccessToken } = await import("../storage");
      await setAccessToken("token-xyz");
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

      const { uploadToGoogleDrive } = await import("../google");
      await expect(uploadToGoogleDrive(["https://example.com"])).rejects.toThrow("403");
    });
  });

  describe("uploadToGoogleSheets", () => {
    it("throws when sheetId is empty", async () => {
      vi.stubGlobal("chrome", createChromeMock({}));
      const { setAccessToken } = await import("../storage");
      await setAccessToken("token-xyz");

      const { uploadToGoogleSheets } = await import("../google");
      const tabs: UploadableTab[] = [{ title: "A", url: "https://a.com", timestamp: "t" }];
      await expect(uploadToGoogleSheets(tabs, "")).rejects.toThrow("Google Sheets ID");
    });

    it("appends rows to Sheet1 of the given spreadsheet", async () => {
      vi.stubGlobal("chrome", createChromeMock({}));
      const { setAccessToken } = await import("../storage");
      await setAccessToken("token-xyz");
      const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
      vi.stubGlobal("fetch", fetchMock);

      const { uploadToGoogleSheets } = await import("../google");
      const tabs: UploadableTab[] = [{ title: "A", url: "https://a.com", timestamp: "t" }];
      await uploadToGoogleSheets(tabs, "sheet-id-123");

      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(
        "https://sheets.googleapis.com/v4/spreadsheets/sheet-id-123/values/Sheet1!A1:append?valueInputOption=RAW"
      );
    });
  });
});
