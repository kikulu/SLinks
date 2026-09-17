# 架構說明

本文件說明 TypeScript 重構後各模組的職責與資料流向，方便後續維護與擴充。

## 整體流程

```
使用者點擊工具列圖示
        │
        ▼
  popup/popup.html ── 載入 ──▶ popup/popup.ts
        │
        │ chrome.tabs.query({})
        ▼
   列出目前所有分頁（排除 chrome:// 等受限頁面）
        │
        ├─ 點擊 Export Txt ──▶ core/export.ts:toTxt()      ──▶ downloadFile()
        │
        ├─ 點擊 Export Markdown ──▶ core/export.ts:toMarkdown() ──▶ downloadFile()
        │
        ├─ 點擊 Export Csv ──▶ 逐一以 chrome.scripting.executeScript
        │                      擷取 meta description
        │                      ──▶ core/export.ts:toCsv() ──▶ downloadFile()
        │
        ├─ 點擊「登入 Google」──▶ chrome.runtime.sendMessage({action:"authenticate"})
        │                        ──▶ background.ts ──▶ core/google.ts:authenticateWithGoogle()
        │
        └─ 點擊「上傳選取分頁」──▶ chrome.runtime.sendMessage({action:"uploadTabs", tabs})
                                 ──▶ background.ts:handleUploadTabs()
                                     ├─ settings.uploadMethod === "drive"  → uploadToGoogleDrive()
                                     ├─ settings.uploadMethod === "sheets" → uploadToGoogleSheets()
                                     └─ 網路離線（fetch 拋出 TypeError）
                                        → 暫存 chrome.storage.local.offlineTabs
                                        → self.addEventListener("online", …) 時自動重試
```

設定頁（`options/options.ts`）負責讀寫 `chrome.storage.sync` 中的偏好設定：

- `exportFormat`：txt / csv / md，供 popup 讀取預設匯出格式使用（目前 popup 三個匯出按鈕皆可直接點擊，此設定作為未來「預設格式」使用的基礎）
- `uploadMethod`：none / drive / sheets，決定「上傳選取分頁」的實際行為
- `sheetId`：`uploadMethod` 為 `sheets` 時，附加資料的目的地試算表 ID
- 頁面也提供「登入 Google」按鈕，與 popup 共用同一套 `chrome.runtime.sendMessage({action:"authenticate"})` 流程

`background.ts`（Service Worker）處理兩類跨情境訊息：

- `action: "uploadTabs"`：交由 `handleUploadTabs()` 依 `AppSettings.uploadMethod` 路由到 `uploadToGoogleDrive()` 或 `uploadToGoogleSheets()`；偵測到疑似離線的網路錯誤時，會將資料存入 `chrome.storage.local.offlineTabs`，並在 `online` 事件觸發時自動重試。
- `action: "authenticate"`：呼叫 `authenticateWithGoogle()`，透過 `chrome.identity.launchWebAuthFlow` 取得 OAuth token 並存入 `chrome.storage.sync`。

## 模組職責

| 檔案 | 職責 |
|------|------|
| `src/types.ts` | 定義 `TabRecord`、`UploadableTab`、`AppSettings`、跨頁面訊息型別等共用介面，確保 popup / options / background 之間型別一致 |
| `src/core/storage.ts` | 封裝所有 `chrome.storage` 讀寫，統一預設值與時間戳格式 |
| `src/core/export.ts` | 純函式：將 `TabRecord[]` 轉為 TXT / CSV / Markdown 字串，並提供瀏覽器下載的共用邏輯（不依賴 chrome.* API，方便撰寫單元測試） |
| `src/core/google.ts` | Google OAuth 授權、Google Drive 上傳、Google Sheets 寫入，全部回傳 `Promise`，並在失敗時拋出有意義的錯誤訊息 |
| `src/background.ts` | Service Worker 進入點，處理訊息路由（依設定決定 Drive / Sheets）與離線佇列重試 |
| `src/popup/popup.ts` | 彈出視窗的 DOM 操作與互動邏輯（匯出 TXT/CSV/Markdown、登入 Google、上傳選取分頁） |
| `src/options/options.ts` | 設定頁的 DOM 操作與互動邏輯（匯出格式、上傳方式、Sheets ID、登入 Google） |
| `src/core/__tests__/*.test.ts` | Vitest 單元測試：`export.test.ts` 涵蓋 TXT/CSV/Markdown 轉換；`storage.test.ts`、`google.test.ts` 透過 `vi.stubGlobal("chrome", …)` 模擬 Chrome API 與 `fetch`，測試授權與上傳流程（含成功、失敗、缺少設定等情境） |

## 開發輔助工具

- **Vitest**：純邏輯模組（`core/*`）的單元測試，透過 mock `chrome` 全域物件與 `fetch` 隔離瀏覽器環境，可在 Node.js 中直接執行（`npm run test`）。
- **ESLint（flat config, `eslint.config.mjs`）+ typescript-eslint**：型別感知的程式碼檢查，搭配 `eslint-config-prettier` 關閉與 Prettier 衝突的排版規則。
- **Prettier**：統一縮排、引號、逗號等排版風格（`npm run format`）。

## 設計原則

1. **純邏輯與 DOM/Chrome API 分離**：`core/export.ts` 中的 `toTxt` / `toCsv` 為不依賴瀏覽器環境的純函式，方便未來加入單元測試。
2. **一致的錯誤處理**：所有非同步函式（Google 相關）皆以 `Promise` 回傳，失敗時 `reject` 有意義的 `Error`，由呼叫端（`background.ts`）轉換為 `RuntimeResponse` 回應 popup。
3. **型別優先**：所有跨模組傳遞的資料（分頁紀錄、設定、訊息）皆在 `types.ts` 中定義好介面，避免使用 `any`。

## 與舊版（純 JS）的差異

舊版原始碼中發現以下問題，已於本次重構中修正：

- `background.js` 最上層有一段會在 Service Worker 啟動時「無條件」呼叫 `uploadToGoogleSheets`／`uploadToGoogleDrive`，且引用了未定義的 `tabs` 變數，實際上永遠會拋出例外。重構後移除此段，改為明確的訊息驅動（`chrome.runtime.onMessage`）與離線重試機制。
- `popup.js` 中對 `chrome.tabs.query` 呼叫了兩次並各自綁定一份幾乎重複的渲染邏輯，容易造成畫面閃爍或重複綁定事件；重構後合併為單一 `renderTabsList()`。
- 原本以 `tab.title.length > 6` 判斷是否要截斷標題（條件寫錯，應是判斷是否超過欲截斷的長度），重構後修正為以 `max`（40）長度判斷。
- `chrome.scripting.executeScript` 的回呼型別在 MV3 中已改為回傳 `Promise`，重構後改用 `await`，移除舊版回呼寫法。
- 原始壓縮包內含一份約 1MB、與本專案完全無關的 `_locales`（內容其實是另一個第三方擴充功能的多國語系字串，含有 `addToObsidian`、`allProperties` 等鍵值），推測為誤植檔案，重構時已移除，避免混淆與增加封裝檔大小。
