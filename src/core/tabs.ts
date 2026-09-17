/**
 * popup / background 共用的分頁工具函式。
 */
import type { UploadableTab } from "../types";

/** 判斷是否為擴充功能無法存取的系統頁面（如 chrome://、chrome-extension://） */
export function isRestrictedUrl(url?: string): boolean {
  return (
    !url ||
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://")
  );
}

/** 將過長的標題截斷並加上省略號，方便在清單中顯示 */
export function truncateTitle(title: string, max = 40): string {
  return title.length > max ? `${title.slice(0, max)}...` : title;
}

/** 將 chrome.tabs.Tab 轉為上傳用的精簡格式 */
export function tabToUploadable(tab: chrome.tabs.Tab, timestamp: string): UploadableTab {
  return {
    title: tab.title ?? tab.url ?? "無標題",
    url: tab.url ?? "",
    timestamp,
  };
}
