/**
 * 自動上傳排程的純邏輯（不依賴 chrome.alarms，方便單元測試）。
 */
import type { AppSettings } from "../types";

export const AUTO_UPLOAD_ALARM_NAME = "slinks-auto-upload";

/** chrome.alarms 建議的最短週期，避免使用者設定過於頻繁的間隔 */
export const MIN_AUTO_UPLOAD_INTERVAL_MINUTES = 5;

export interface AutoUploadAlarmConfig {
  periodInMinutes: number;
}

/**
 * 根據使用者設定計算自動上傳鬧鐘的排程設定。
 * 回傳 null 代表不應該建立鬧鐘（自動上傳未啟用，或尚未選擇上傳方式）。
 */
export function getAutoUploadAlarmConfig(settings: AppSettings): AutoUploadAlarmConfig | null {
  if (!settings.autoUpload || settings.uploadMethod === "none") {
    return null;
  }
  const requested = settings.autoUploadIntervalMinutes || MIN_AUTO_UPLOAD_INTERVAL_MINUTES;
  return { periodInMinutes: Math.max(MIN_AUTO_UPLOAD_INTERVAL_MINUTES, requested) };
}
