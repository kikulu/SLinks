# Changelog

本專案遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式。

## [1.2.0] - 2026-09-17

### 新增

- **Google 登入 / 上傳 UI**：popup 與設定頁皆加入「登入 Google」按鈕；popup 新增「上傳選取分頁」按鈕，可依設定頁選擇的方式上傳到 Google Drive 或 Google Sheets。
- **Google Sheets 支援**：設定頁可選擇上傳方式（不上傳 / Google Drive / Google Sheets），並在選擇 Sheets 時填入目的地試算表 ID；上傳時會將 `時間戳 / 標題 / 網址` 附加到該試算表的 `Sheet1` 工作表。
- **離線自動重試**：`background.ts` 的 `handleUploadTabs()` 偵測到疑似離線的網路錯誤（`fetch` 拋出 `TypeError`）時，會將待上傳分頁暫存於 `chrome.storage.local`，並在瀏覽器觸發 `online` 事件時自動重試。
- **Markdown 匯出**：新增 `core/export.ts:toMarkdown()`，popup 新增「Export Markdown」按鈕，可將選取分頁匯出為 `.md` 清單（含匯出時間，若有摘要則以引用區塊附加）；設定頁「匯出格式」新增 Markdown 選項。
- **單元測試（Vitest）**：新增 `vitest.config.ts` 與 `src/core/__tests__/`，涵蓋 `export.ts`（TXT/CSV/Markdown 轉換）、`storage.ts`（設定讀寫、token 存取、時間戳格式）、`google.ts`（OAuth 授權、Drive/Sheets 上傳的成功與失敗情境，皆以 `vi.stubGlobal` 模擬 `chrome` 與 `fetch`），共 19 個測試，`npm run test` 一鍵執行。
- **ESLint + Prettier**：新增 `eslint.config.mjs`（flat config + typescript-eslint + eslint-config-prettier）與 `.prettierrc.json`／`.prettierignore`，並提供 `lint` / `lint:fix` / `format` / `format:check` 指令；全專案程式碼已通過檢查與格式化。

### 變更

- `RuntimeMessage` 中的 `UploadTabsMessage` 由 `{ urls: string[] }` 改為 `{ tabs: UploadableTab[] }`，讓 Google Sheets 上傳能同時取得標題與時間戳，而不只是網址。
- `core/google.ts:uploadToGoogleSheets()` 改吃輕量的 `UploadableTab[]`（不再需要 `TabRecord` 的 `summary` 欄位），並修正 Sheets API 呼叫網址（原本缺少工作表名稱，改為固定寫入 `Sheet1!A1:append`）。
- `manifest.json` / `package.json` 版本號更新為 `1.2.0`。

---

## [1.1.0] - 2026-09-17

### 重構

- 將整個專案由純 JavaScript 改寫為 **TypeScript**，並以 **Rollup** 建置，取代直接使用未打包的原始檔。
- 重新整理專案結構：`src/core`（storage / export / google）、`src/popup`、`src/options`、`src/background.ts`，各模組職責單一、型別明確（詳見 `docs/ARCHITECTURE.md`）。
- 新增 `types.ts` 統一定義 `TabRecord`、`AppSettings`、跨頁面訊息型別。
- 加入 `tsconfig.json`、`rollup.config.mjs`、`package.json` 建置腳本（`build` / `watch` / `typecheck` / `clean`）。
- 加入 Git 版本控制與 `.gitignore`（忽略 `node_modules/`、`dist/`）。

### 修正

- 修正 `background.js` 中一段會在 Service Worker 啟動時無條件執行、且引用未定義變數 `tabs` 的錯誤程式碼；改為明確的訊息驅動流程。
- 修正 popup 重複查詢並重複渲染分頁清單的問題。
- 修正標題截斷長度判斷條件錯誤（原本以 `length > 6` 判斷卻截斷至 40 字）。
- 將 `chrome.scripting.executeScript` 的回呼寫法改為 `Promise`/`await`，符合 Manifest V3 建議寫法。
- CSV 匯出失敗、未選取分頁等情境改以頁面內的錯誤訊息顯示，取代原本的瀏覽器 `alert`。

### 移除

- 移除封裝內誤植、與本專案無關的 `_locales` 多國語系檔案（內容經確認為另一個第三方擴充功能的字串資源，約 960KB，與 SLinks 功能無關）。

### 已知限制 / 後續規劃

- Google OAuth 上傳功能（Drive / Sheets）程式碼已重構完成，但目前未在 popup / options UI 中提供對應按鈕，需自行串接（見 README「後續規劃」）。

---

## [1.0.1] - 原始版本

- `manifest.json` 版本更新為 `1.0.1`，`permissions` 加入 `"scripting"`，`host_permissions` 開放為 `https://*/*`、`http://*/*`。

## [1.0.0] - 原始版本

- 初始版本：可選取分頁、匯出 TXT / CSV，並包含尚未完成整合的 Google Sheets / Drive 上傳程式碼。
