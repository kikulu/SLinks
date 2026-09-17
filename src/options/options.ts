/**
 * 設定頁：
 * - 匯出格式（TXT / CSV / Markdown）預設值
 * - 上傳方式（不上傳 / Google Drive / Google Sheets）與 Google Sheets ID
 * - 自動上傳（是否啟用、間隔分鐘數）
 * - Google 帳號登入 / 登出
 * 所有設定變更會即時儲存到 chrome.storage.sync，供 popup / background 讀取。
 */
import type { AppSettings, RuntimeMessage, RuntimeResponse } from "../types";
import { getAccessToken, getSettings, saveSettings } from "../core/storage";

async function sendRuntimeMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  return (await chrome.runtime.sendMessage(message)) as RuntimeResponse;
}

function setRowVisible(elementId: string, visible: boolean): void {
  const row = document.getElementById(elementId);
  if (row) {
    row.style.display = visible ? "block" : "none";
  }
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
  const autoUploadCheckbox = document.getElementById("autoUpload") as HTMLInputElement | null;

  const applyUploadMethodAvailability = (uploadMethod: AppSettings["uploadMethod"]): void => {
    setRowVisible("sheetIdRow", uploadMethod === "sheets");
    if (autoUploadCheckbox) {
      const canAutoUpload = uploadMethod !== "none";
      autoUploadCheckbox.disabled = !canAutoUpload;
      if (!canAutoUpload) {
        autoUploadCheckbox.checked = false;
        setRowVisible("autoUploadIntervalRow", false);
      }
    }
  };

  applyUploadMethodAvailability(settings.uploadMethod);
  uploadMethodRadios.forEach((radio) => {
    radio.checked = radio.value === settings.uploadMethod;
    radio.addEventListener("change", () => {
      if (radio.checked) {
        const uploadMethod = radio.value as AppSettings["uploadMethod"];
        applyUploadMethodAvailability(uploadMethod);
        void saveSettings({
          uploadMethod,
          ...(uploadMethod === "none" ? { autoUpload: false } : {}),
        });
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

  // 自動上傳
  const autoUploadIntervalSelect = document.getElementById(
    "autoUploadInterval"
  ) as HTMLSelectElement | null;
  if (autoUploadCheckbox) {
    autoUploadCheckbox.checked = settings.autoUpload;
    setRowVisible("autoUploadIntervalRow", settings.autoUpload);
    autoUploadCheckbox.addEventListener("change", () => {
      setRowVisible("autoUploadIntervalRow", autoUploadCheckbox.checked);
      void saveSettings({ autoUpload: autoUploadCheckbox.checked });
    });
  }
  if (autoUploadIntervalSelect) {
    autoUploadIntervalSelect.value = String(settings.autoUploadIntervalMinutes);
    autoUploadIntervalSelect.addEventListener("change", () => {
      void saveSettings({ autoUploadIntervalMinutes: Number(autoUploadIntervalSelect.value) });
    });
  }

  // Google 登入 / 登出
  const loginButton = document.getElementById("googleLogin") as HTMLButtonElement | null;
  const logoutButton = document.getElementById("googleLogout") as HTMLButtonElement | null;

  const refreshAuthStatus = async (): Promise<void> => {
    const token = await getAccessToken();
    if (loginButton) loginButton.disabled = Boolean(token);
    if (logoutButton) logoutButton.disabled = !token;
    showAuthStatus(token ? "已登入 Google ✅" : "尚未登入 Google");
  };
  await refreshAuthStatus();

  loginButton?.addEventListener("click", async () => {
    showAuthStatus("登入中...");
    loginButton.disabled = true;
    try {
      const response = await sendRuntimeMessage({ action: "authenticate" });
      if (response.success) {
        await refreshAuthStatus();
      } else {
        showAuthStatus(response.error ?? "Google 授權失敗，請重試！", true);
        loginButton.disabled = false;
      }
    } catch (error) {
      showAuthStatus((error as Error).message, true);
      loginButton.disabled = false;
    }
  });

  logoutButton?.addEventListener("click", async () => {
    showAuthStatus("登出中...");
    logoutButton.disabled = true;
    try {
      const response = await sendRuntimeMessage({ action: "signOut" });
      if (response.success) {
        await refreshAuthStatus();
      } else {
        showAuthStatus(response.error ?? "登出失敗，請重試！", true);
        logoutButton.disabled = false;
      }
    } catch (error) {
      showAuthStatus((error as Error).message, true);
      logoutButton.disabled = false;
    }
  });
});
