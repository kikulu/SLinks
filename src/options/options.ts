/**
 * 設定頁：目前提供匯出格式（TXT / CSV）的預設值切換，
 * 並會即時儲存到 chrome.storage.sync 供 popup 使用。
 */
import { AppSettings } from "../types";
import { getSettings, saveSettings } from "../core/storage";

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await getSettings();
  const radios = document.querySelectorAll<HTMLInputElement>('input[name="exportFormat"]');

  radios.forEach((radio) => {
    radio.checked = radio.value === settings.exportFormat;
    radio.addEventListener("change", () => {
      if (radio.checked) {
        void saveSettings({ exportFormat: radio.value as AppSettings["exportFormat"] });
      }
    });
  });
});
