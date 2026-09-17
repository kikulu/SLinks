/**
 * 專案共用型別定義
 */

/** 匯出用的單一分頁紀錄 */
export interface TabRecord {
  title: string;
  url: string;
  timestamp: string;
  summary: string;
}

export type ExportFormat = "txt" | "csv";
export type UploadMethod = "none" | "drive" | "sheets";

/** 儲存在 chrome.storage.sync 的使用者設定 */
export interface AppSettings {
  exportFormat: ExportFormat;
  uploadMethod: UploadMethod;
  autoUpload: boolean;
  sheetId?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  exportFormat: "txt",
  uploadMethod: "none",
  autoUpload: false,
};

/** popup -> background 的訊息型別 */
export interface UploadTabsMessage {
  action: "uploadTabs";
  urls: string[];
}

export interface AuthenticateMessage {
  action: "authenticate";
}

export type RuntimeMessage = UploadTabsMessage | AuthenticateMessage;

export interface RuntimeResponse {
  success: boolean;
  error?: string;
  token?: string;
}
