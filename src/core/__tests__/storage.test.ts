import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../types";

// storage.ts 在被 import 時就會使用到全域的 chrome 物件，
// 因此在每個測試前先建立一份可控制的 mock。
function createChromeMock() {
  const syncStore: Record<string, unknown> = {};

  return {
    storage: {
      sync: {
        get: vi.fn((defaultsOrKey: unknown) => {
          if (typeof defaultsOrKey === "string") {
            return Promise.resolve({ [defaultsOrKey]: syncStore[defaultsOrKey] });
          }
          // 傳入預設值物件時，將預設值與已儲存的值合併（模擬 chrome.storage.sync.get 行為）
          const defaults = defaultsOrKey as Record<string, unknown>;
          return Promise.resolve({ ...defaults, ...syncStore });
        }),
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
    __syncStore: syncStore,
  };
}

describe("core/storage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("chrome", createChromeMock());
  });

  it("getSettings merges saved values on top of DEFAULT_SETTINGS", async () => {
    const { getSettings, saveSettings } = await import("../storage");
    await saveSettings({ exportFormat: "csv" });
    const settings = await getSettings();
    expect(settings).toEqual({ ...DEFAULT_SETTINGS, exportFormat: "csv" });
  });

  it("setAccessToken / getAccessToken round-trip through chrome.storage.sync", async () => {
    const { getAccessToken, setAccessToken } = await import("../storage");
    expect(await getAccessToken()).toBeUndefined();
    await setAccessToken("test-token-123");
    expect(await getAccessToken()).toBe("test-token-123");
  });

  it("clearAccessToken removes the stored token", async () => {
    const { clearAccessToken, getAccessToken, setAccessToken } = await import("../storage");
    await setAccessToken("test-token-123");
    await clearAccessToken();
    expect(await getAccessToken()).toBeUndefined();
  });

  it("getTimestamp returns a valid ISO-8601 string", async () => {
    const { getTimestamp } = await import("../storage");
    const timestamp = getTimestamp();
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(timestamp).toString()).not.toBe("Invalid Date");
  });
});
