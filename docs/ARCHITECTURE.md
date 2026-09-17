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
        ├─ 點擊 Export Txt ──▶ core/export.ts:toTxt()  ──▶ downloadFile()
        │
        └─ 點擊 Export Csv ──▶ 逐一以 chrome.scripting.executeScript
                               擷取 meta description
                               ──▶ core/export.ts:toCsv() ──▶ downloadFile()
```

設定頁（`options/options.ts`）負責讀寫 `chrome.storage.sync` 中的 `exportFormat` 等偏好設定，供未來 popup 讀取預設匯出格式使用。

`background.ts`（Service Worker）目前處理兩類跨情境訊息：

- `action: "uploadTabs"`：呼叫 `core/google.ts` 中的 `uploadToGoogleDrive()`，將網址清單上傳為文字檔。
- `action: "authenticate"`：呼叫 `authenticateWithGoogle()`，透過 `chrome.identity.launchWebAuthFlow` 取得 OAuth token 並存入 `chrome.storage.sync`。

## 模組職責

| 檔案 | 職責 |
|------|------|
| `src/types.ts` | 定義 `TabRecord`、`AppSettings`、跨頁面訊息型別等共用介面，確保 popup / options / background 之間型別一致 |
| `src/core/storage.ts` | 封裝所有 `chrome.storage` 讀寫，統一預設值與時間戳格式 |
| `src/core/export.ts` | 純函式：將 `TabRecord[]` 轉為 TXT / CSV 字串，並提供瀏覽器下載的共用邏輯（不依賴 chrome.* API，方便日後撰寫單元測試） |
| `src/core/google.ts` | Google OAuth 授權、Google Drive 上傳、Google Sheets 寫入，全部回傳 `Promise`，並在失敗時拋出有意義的錯誤訊息 |
| `src/background.ts` | Service Worker 進入點，處理訊息路由與離線佇列重試 |
| `src/popup/popup.ts` | 彈出視窗的 DOM 操作與互動邏輯 |
| `src/options/options.ts` | 設定頁的 DOM 操作與互動邏輯 |

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
