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

/** 上傳到 Google Drive / Sheets 用的精簡分頁資訊（不需要摘要） */
export interface UploadableTab {
  title: string;
  url: string;
  timestamp: string;
}

export type ExportFormat = "txt" | "csv" | "md";
export type UploadMethod = "none" | "drive" | "sheets";

/** 儲存在 chrome.storage.sync 的使用者設定 */
export interface AppSettings {
  exportFormat: ExportFormat;
  uploadMethod: UploadMethod;
  autoUpload: boolean;
  /** 自動上傳的間隔（分鐘），僅在 autoUpload 為 true 時生效 */
  autoUploadIntervalMinutes: number;
  sheetId?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  exportFormat: "txt",
  uploadMethod: "none",
  autoUpload: false,
  autoUploadIntervalMinutes: 30,
};

/** popup -> background 的訊息型別 */
export interface UploadTabsMessage {
  action: "uploadTabs";
  tabs: UploadableTab[];
}

export interface AuthenticateMessage {
  action: "authenticate";
}

export interface SignOutMessage {
  action: "signOut";
}

export type RuntimeMessage = UploadTabsMessage | AuthenticateMessage | SignOutMessage;

export interface RuntimeResponse {
  success: boolean;
  error?: string;
  token?: string;
}
