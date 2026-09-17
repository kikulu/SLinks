/**
 * 將選取的分頁轉換為 TXT / CSV 內容，並觸發瀏覽器下載。
 */
import { TabRecord } from "../types";

export function toTxt(tabs: TabRecord[]): string {
  return tabs.map((tab) => `${tab.title} - ${tab.url}`).join("\n");
}

export function toCsv(tabs: TabRecord[]): string {
  const escape = (value: string): string => `"${value.replace(/"/g, '""')}"`;
  const header = "Title,URL,Time,Summary";
  const rows = tabs.map((tab) =>
    [tab.title, tab.url, tab.timestamp, tab.summary].map(escape).join(",")
  );
  // 開頭加上 UTF-8 BOM，避免 Excel 開啟中文亂碼
  return ["\uFEFF" + header, ...rows].join("\n");
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(anchor.href);
}
