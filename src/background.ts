/**
 * Manifest V3 Service Worker
 * 負責處理 popup 傳來的訊息（上傳 / 授權），以及離線佇列的自動補上傳。
 */
import { RuntimeMessage, RuntimeResponse } from "./types";
import { getSettings } from "./core/storage";
import { authenticateWithGoogle, uploadToGoogleDrive } from "./core/google";

chrome.runtime.onMessage.addListener(
  (message: RuntimeMessage, _sender, sendResponse: (response: RuntimeResponse) => void) => {
    if (message.action === "uploadTabs") {
      uploadToGoogleDrive(message.urls)
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
    const offlineTabs = data.offlineTabs as string[] | undefined;
    if (offlineTabs && offlineTabs.length > 0) {
      uploadToGoogleDrive(offlineTabs)
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
