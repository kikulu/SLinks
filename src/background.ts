/**
 * Manifest V3 Service Worker
 * 負責處理 popup 傳來的訊息（上傳 / 授權），以及離線佇列的自動補上傳。
 */
import type { RuntimeMessage, RuntimeResponse, UploadableTab } from "./types";
import { getSettings } from "./core/storage";
import { authenticateWithGoogle, uploadToGoogleDrive, uploadToGoogleSheets } from "./core/google";

/**
 * 依照使用者在設定頁選擇的上傳方式，將分頁資訊上傳到 Google Drive 或 Google Sheets。
 * 若偵測到疑似離線的網路錯誤，會將待上傳資料暫存到 chrome.storage.local，
 * 待網路恢復（見下方 "online" 監聽器）後自動重試。
 */
async function handleUploadTabs(tabs: UploadableTab[]): Promise<void> {
  const settings = await getSettings();

  try {
    if (settings.uploadMethod === "drive") {
      await uploadToGoogleDrive(tabs.map((tab) => tab.url));
    } else if (settings.uploadMethod === "sheets") {
      if (!settings.sheetId) {
        throw new Error("尚未設定 Google Sheets ID，請至設定頁填寫。");
      }
      await uploadToGoogleSheets(tabs, settings.sheetId);
    } else {
      throw new Error("尚未選擇上傳方式，請至設定頁選擇 Google Drive 或 Google Sheets。");
    }
  } catch (error) {
    // fetch 在離線時會拋出 TypeError（例如 "Failed to fetch"），視為網路問題並暫存待重試
    if (error instanceof TypeError) {
      await chrome.storage.local.set({ offlineTabs: tabs });
      throw new Error("目前似乎處於離線狀態，已暫存待上傳分頁，恢復連線後將自動重試。");
    }
    throw error;
  }
}

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse: (response: RuntimeResponse) => void) => {
    if (message.action === "uploadTabs") {
      handleUploadTabs(message.tabs)
        .then(() => sendResponse({ success: true }))
        .catch((error: Error) => sendResponse({ success: false, error: error.message }));
      return true; // 非同步回應，保持通道開啟
    }

    if (message.action === "authenticate") {
      authenticateWithGoogle()
        .then((token) => sendResponse({ success: true, token }))
        .catch((error: Error) => sendResponse({ success: false, error: error.message }));
      return true;
    }

    return false;
  }
);

/** 網路恢復時，自動重試先前失敗、暫存於本機的分頁清單 */
self.addEventListener("online", () => {
  chrome.storage.local.get(["offlineTabs"], (data) => {
    const offlineTabs = data.offlineTabs as UploadableTab[] | undefined;
    if (offlineTabs && offlineTabs.length > 0) {
      handleUploadTabs(offlineTabs)
        .then(() => chrome.storage.local.remove("offlineTabs"))
        .catch((error: Error) => console.error("離線分頁自動上傳失敗：", error.message));
    }
  });
});

chrome.runtime.onInstalled.addListener(() => {
  getSettings().then((settings) => {
    console.log("SLinks 已安裝／更新，目前設定：", settings);
  });
});
