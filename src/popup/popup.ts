/**
 * 彈出視窗：列出目前所有分頁，讓使用者勾選並匯出為 TXT / CSV。
 */
import { TabRecord } from "../types";
import { downloadFile, toCsv, toTxt } from "../core/export";
import { getTimestamp } from "../core/storage";

function isRestrictedUrl(url?: string): boolean {
  return !url || url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("edge://");
}

function truncateTitle(title: string, max = 40): string {
  return title.length > max ? `${title.slice(0, max)}...` : title;
}

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

function showError(message: string): void {
  const errorEl = document.getElementById("errorMessage");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.style.display = message ? "block" : "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const tabsList = document.getElementById("tabsList") as HTMLUListElement;
  const selectAllButton = document.getElementById("selectAll") as HTMLButtonElement;
  const exportTxtButton = document.getElementById("exportTxt") as HTMLButtonElement;
  const exportCsvButton = document.getElementById("exportCsv") as HTMLButtonElement;
  let isAllSelected = false;

  chrome.tabs.query({}, (tabs) => renderTabsList(tabsList, tabs));

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
});
