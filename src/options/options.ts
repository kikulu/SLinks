/**
 * 設定頁：
 * - 匯出格式（TXT / CSV / Markdown）預設值
 * - 上傳方式（不上傳 / Google Drive / Google Sheets）與 Google Sheets ID
 * - Google 帳號登入狀態
 * 所有設定變更會即時儲存到 chrome.storage.sync，供 popup / background 讀取。
 */
import type { AppSettings, RuntimeMessage, RuntimeResponse } from "../types";
import { getAccessToken, getSettings, saveSettings } from "../core/storage";

async function sendRuntimeMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  return (await chrome.runtime.sendMessage(message)) as RuntimeResponse;
}

function updateSheetIdVisibility(uploadMethod: AppSettings["uploadMethod"]): void {
  const row = document.getElementById("sheetIdRow");
  if (!row) return;
  row.style.display = uploadMethod === "sheets" ? "block" : "none";
}

function showAuthStatus(message: string, isError = false): void {
  const statusEl = document.getElementById("authStatus");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("error-text", isError);
}

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await getSettings();

  // Export Format
  const exportFormatRadios = document.querySelectorAll<HTMLInputElement>(
    'input[name="exportFormat"]'
  );
  exportFormatRadios.forEach((radio) => {
    radio.checked = radio.value === settings.exportFormat;
    radio.addEventListener("change", () => {
      if (radio.checked) {
        void saveSettings({ exportFormat: radio.value as AppSettings["exportFormat"] });
      }
    });
  });

  // Upload Method
  const uploadMethodRadios = document.querySelectorAll<HTMLInputElement>(
    'input[name="uploadMethod"]'
  );
  updateSheetIdVisibility(settings.uploadMethod);
  uploadMethodRadios.forEach((radio) => {
    radio.checked = radio.value === settings.uploadMethod;
    radio.addEventListener("change", () => {
      if (radio.checked) {
        const uploadMethod = radio.value as AppSettings["uploadMethod"];
        updateSheetIdVisibility(uploadMethod);
        void saveSettings({ uploadMethod });
      }
    });
  });

  // Google Sheets ID
  const sheetIdInput = document.getElementById("sheetId") as HTMLInputElement | null;
  if (sheetIdInput) {
    sheetIdInput.value = settings.sheetId ?? "";
    sheetIdInput.addEventListener("change", () => {
      void saveSettings({ sheetId: sheetIdInput.value.trim() });
    });
  }

  // Google 登入狀態
  const token = await getAccessToken();
  showAuthStatus(token ? "已登入 Google ✅" : "尚未登入 Google");

  const loginButton = document.getElementById("googleLogin") as HTMLButtonElement | null;
  loginButton?.addEventListener("click", async () => {
    showAuthStatus("登入中...");
    loginButton.disabled = true;
    try {
      const response = await sendRuntimeMessage({ action: "authenticate" });
      if (response.success) {
        showAuthStatus("已登入 Google ✅");
      } else {
        showAuthStatus(response.error ?? "Google 授權失敗，請重試！", true);
      }
    } catch (error) {
      showAuthStatus((error as Error).message, true);
    } finally {
      loginButton.disabled = false;
    }
  });
});
