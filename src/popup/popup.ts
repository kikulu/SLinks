/**
 * 彈出視窗：列出目前所有分頁，讓使用者勾選並匯出為 TXT / CSV / Markdown，
 * 或透過 background.ts 上傳到 Google Drive / Google Sheets，並可登入／登出 Google。
 */
import type { RuntimeMessage, RuntimeResponse, TabRecord, UploadableTab } from "../types";
import { downloadFile, toCsv, toMarkdown, toTxt } from "../core/export";
import { getAccessToken, getTimestamp } from "../core/storage";
import { isRestrictedUrl, truncateTitle } from "../core/tabs";

/** 透過 chrome.scripting 擷取頁面 meta description（失敗時回傳提示字串） */
async function fetchDescription(tabId: number): Promise<string> {
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const meta = document.querySelector('meta[name="description"]');
        const og = document.querySelector('meta[property="og:description"]');
        return meta?.getAttribute("content") ?? og?.getAttribute("content") ?? "";
      },
    });
    const result = injection?.result as string | undefined;
    return result && result.length > 0 ? result : "無摘要";
  } catch {
    return "無法擷取摘要";
  }
}

function renderTabsList(listEl: HTMLUListElement, tabs: chrome.tabs.Tab[]): void {
  listEl.innerHTML = "";
  tabs.forEach((tab) => {
    const restricted = isRestrictedUrl(tab.url);

    const li = document.createElement("li");
    li.style.opacity = restricted ? "0.5" : "1";
    li.style.pointerEvents = restricted ? "none" : "auto";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "tabCheckbox";
    checkbox.value = tab.url ?? "";
    checkbox.disabled = restricted;
    checkbox.dataset.tabId = String(tab.id ?? "");
    checkbox.dataset.title = tab.title ?? tab.url ?? "無標題";

    const title = document.createElement("span");
    title.textContent = truncateTitle(tab.title || tab.url || "無標題");

    li.append(checkbox, title);
    listEl.appendChild(li);
  });
}

function getSelectedCheckboxes(): HTMLInputElement[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>(".tabCheckbox:checked"));
}

function toUploadableTabs(checkboxes: HTMLInputElement[]): UploadableTab[] {
  return checkboxes.map((cb) => ({
    title: cb.dataset.title ?? "",
    url: cb.value,
    timestamp: getTimestamp(),
  }));
}

function showError(message: string): void {
  const errorEl = document.getElementById("errorMessage");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = message ? "block" : "none";
}

function showStatus(message: string, isError = false): void {
  const statusEl = document.getElementById("googleStatus");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("error-text", isError);
}

/** 包裝 chrome.runtime.sendMessage，取得型別化的回應 */
async function sendRuntimeMessage(message: RuntimeMessage): Promise<RuntimeResponse> {
  return (await chrome.runtime.sendMessage(message)) as RuntimeResponse;
}

function setGoogleButtonsState(
  isLoggedIn: boolean,
  buttons: {
    loginButton: HTMLButtonElement;
    logoutButton: HTMLButtonElement;
  }
): void {
  buttons.loginButton.disabled = isLoggedIn;
  buttons.logoutButton.disabled = !isLoggedIn;
}

document.addEventListener("DOMContentLoaded", () => {
  const tabsList = document.getElementById("tabsList") as HTMLUListElement;
  const selectAllButton = document.getElementById("selectAll") as HTMLButtonElement;
  const exportTxtButton = document.getElementById("exportTxt") as HTMLButtonElement;
  const exportCsvButton = document.getElementById("exportCsv") as HTMLButtonElement;
  const exportMdButton = document.getElementById("exportMd") as HTMLButtonElement;
  const googleLoginButton = document.getElementById("googleLogin") as HTMLButtonElement;
  const googleLogoutButton = document.getElementById("googleLogout") as HTMLButtonElement;
  const uploadSelectedButton = document.getElementById("uploadSelected") as HTMLButtonElement;
  let isAllSelected = false;

  chrome.tabs.query({}, (tabs) => renderTabsList(tabsList, tabs));

  const refreshGoogleStatus = async (): Promise<void> => {
    const token = await getAccessToken();
    setGoogleButtonsState(Boolean(token), {
      loginButton: googleLoginButton,
      logoutButton: googleLogoutButton,
    });
    showStatus(token ? "已登入 Google ✅" : "尚未登入 Google");
  };
  void refreshGoogleStatus();

  selectAllButton.addEventListener("click", () => {
    isAllSelected = !isAllSelected;
    document.querySelectorAll<HTMLInputElement>(".tabCheckbox:not(:disabled)").forEach((cb) => {
      cb.checked = isAllSelected;
    });
    selectAllButton.textContent = isAllSelected ? "Undo Selected" : "Select All";
  });

  exportTxtButton.addEventListener("click", () => {
    showError("");
    const selected = getSelectedCheckboxes();
    if (selected.length === 0) {
      showError("請先選擇要匯出的分頁！");
      return;
    }
    const tabs: TabRecord[] = selected.map((cb) => ({
      title: cb.dataset.title ?? "",
      url: cb.value,
      timestamp: getTimestamp(),
      summary: "",
    }));
    downloadFile(toTxt(tabs), `SLinks_${getTimestamp()}.txt`, "text/plain");
  });

  exportMdButton.addEventListener("click", () => {
    showError("");
    const selected = getSelectedCheckboxes();
    if (selected.length === 0) {
      showError("請先選擇要匯出的分頁！");
      return;
    }
    const exportedAt = getTimestamp();
    const tabs: TabRecord[] = selected.map((cb) => ({
      title: cb.dataset.title ?? "",
      url: cb.value,
      timestamp: exportedAt,
      summary: "",
    }));
    downloadFile(
      toMarkdown(tabs, exportedAt),
      `SLinks_${exportedAt}.md`,
      "text/markdown;charset=utf-8"
    );
  });

  exportCsvButton.addEventListener("click", async () => {
    showError("");
    const selected = getSelectedCheckboxes();
    if (selected.length === 0) {
      showError("請先選擇要匯出的分頁！");
      return;
    }

    const originalLabel = exportCsvButton.textContent ?? "Export CSV";
    exportCsvButton.disabled = true;
    exportCsvButton.textContent = "擷取摘要中...";

    try {
      const tabs: TabRecord[] = await Promise.all(
        selected.map(async (cb) => {
          const tabId = Number(cb.dataset.tabId);
          const summary = Number.isFinite(tabId) ? await fetchDescription(tabId) : "無摘要";
          return {
            title: cb.dataset.title ?? "",
            url: cb.value,
            timestamp: getTimestamp(),
            summary,
          };
        })
      );
      downloadFile(toCsv(tabs), `SLinks_${getTimestamp()}.csv`, "text/csv;charset=utf-8");
    } catch (error) {
      showError(`匯出失敗：${(error as Error).message}`);
    } finally {
      exportCsvButton.disabled = false;
      exportCsvButton.textContent = originalLabel;
    }
  });

  googleLoginButton.addEventListener("click", async () => {
    showStatus("登入中...");
    googleLoginButton.disabled = true;
    try {
      const response = await sendRuntimeMessage({ action: "authenticate" });
      if (response.success) {
        await refreshGoogleStatus();
      } else {
        showStatus(response.error ?? "Google 授權失敗", true);
        googleLoginButton.disabled = false;
      }
    } catch (error) {
      showStatus((error as Error).message, true);
      googleLoginButton.disabled = false;
    }
  });

  googleLogoutButton.addEventListener("click", async () => {
    showStatus("登出中...");
    googleLogoutButton.disabled = true;
    try {
      const response = await sendRuntimeMessage({ action: "signOut" });
      if (response.success) {
        await refreshGoogleStatus();
      } else {
        showStatus(response.error ?? "登出失敗", true);
        googleLogoutButton.disabled = false;
      }
    } catch (error) {
      showStatus((error as Error).message, true);
      googleLogoutButton.disabled = false;
    }
  });

  uploadSelectedButton.addEventListener("click", async () => {
    showError("");
    const selected = getSelectedCheckboxes();
    if (selected.length === 0) {
      showError("請先選擇要上傳的分頁！");
      return;
    }

    const originalLabel = uploadSelectedButton.textContent ?? "上傳選取分頁";
    uploadSelectedButton.disabled = true;
    uploadSelectedButton.textContent = "上傳中...";
    showStatus("上傳中...");

    try {
      const tabs = toUploadableTabs(selected);
      const response = await sendRuntimeMessage({ action: "uploadTabs", tabs });
      if (response.success) {
        showStatus(`已成功上傳 ${tabs.length} 個分頁 ✅`);
      } else {
        showStatus(response.error ?? "上傳失敗", true);
      }
    } catch (error) {
      showStatus((error as Error).message, true);
    } finally {
      uploadSelectedButton.disabled = false;
      uploadSelectedButton.textContent = originalLabel;
    }
  });
});
