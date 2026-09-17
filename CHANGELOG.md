# Changelog

本專案遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/) 格式。

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
