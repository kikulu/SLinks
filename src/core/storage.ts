/**
 * 封裝 chrome.storage 存取邏輯，統一管理設定與 Google 授權 token。
 */
import type { AppSettings } from "../types";
import { DEFAULT_SETTINGS } from "../types";

export async function getSettings(): Promise<AppSettings> {
  const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return stored as AppSettings;
}

export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  await chrome.storage.sync.set(partial);
}

export async function getAccessToken(): Promise<string | undefined> {
  const { accessToken } = await chrome.storage.sync.get("accessToken");
  return accessToken as string | undefined;
}

export async function setAccessToken(token: string): Promise<void> {
  await chrome.storage.sync.set({ accessToken: token });
}

export async function clearAccessToken(): Promise<void> {
  await chrome.storage.sync.remove("accessToken");
}

/** 例如 "2025-05-16T00:15:30.456Z" */
export function getTimestamp(): string {
  return new Date().toISOString();
}
