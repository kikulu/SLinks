# 🔖 SLinks – Tabs Exporter

匯出你的分頁到 CSV / TXT，或上傳到 Google Drive。

一款簡潔實用的 Chrome / Brave 擴充功能，讓你能夠選取目前開啟的分頁，並將其匯出為 `.csv` 或 `.txt` 檔案，或直接上傳至 Google Drive。支援完整標題、URL、時間戳與頁面摘要（meta description）！

本專案為原本以純 JavaScript 撰寫的擴充功能重構版，改以 **TypeScript** 開發、使用 **Rollup** 打包，並整理成標準的 Manifest V3 專案結構。

---

## ✨ 功能特色

- ✅ 選取目前開啟的分頁並匯出
- 📄 支援匯出為 `.csv` 或 `.txt`（可在設定頁切換預設格式）
- 🕒 自動加入當前時間戳（完整 ISO 格式）
- 📝 擷取每個分頁的 meta description 作為摘要（僅 CSV 匯出時擷取）
- ☁️ 內建 Google OAuth 授權與上傳到 Google Drive 的模組（`src/core/google.ts`），可作為後續功能擴充的基礎
- 🧠 自動排除無法存取的系統頁面（如 `chrome://`），並以灰階顯示
- 🎨 現代化 UI，支援 Google Fonts

---

## 🛠 技術架構

| 技術 | 說明 |
|------|------|
| TypeScript | 強型別開發，提升可維護性與重構安全性 |
| Rollup | 輕量打包工具，支援模組化與 Tree Shaking |
| Manifest V3 | 最新 Chrome 擴展架構（`service_worker` 背景頁） |
| Chrome APIs | 使用 `tabs`、`scripting`、`storage`、`identity` 等原生 API |
| Google OAuth 2.0 | 授權上傳檔案至 Google Drive / Google Sheets |

更完整的模組職責說明請見 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

---

## 📂 專案結構

```
tabs-exporter/
├── src/
│   ├── manifest.json         # 擴充功能設定檔
│   ├── types.ts              # 共用型別定義
│   ├── background.ts         # Service Worker 進入點
│   ├── core/
│   │   ├── storage.ts        # chrome.storage 封裝
│   │   ├── export.ts         # TXT / CSV 產生與下載
│   │   └── google.ts         # Google OAuth / Drive / Sheets
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.ts          # 彈出視窗邏輯
│   └── options/
│       ├── options.html
│       ├── options.css
│       └── options.ts        # 設定頁邏輯
├── icons/                    # 擴充功能圖示
├── docs/                     # 開發文件
├── dist/                     # 建置輸出（git 已忽略，執行 npm run build 產生）
├── rollup.config.mjs
├── tsconfig.json
└── package.json
```

---

## 🚀 開始開發

### 需求

- Node.js 18 以上
- npm

### 安裝依賴

```bash
git clone https://github.com/your-username/tabs-exporter.git
cd tabs-exporter
npm install
```

### 建置

```bash
npm run build
```

建置完成後，`dist/` 資料夾即為可直接載入瀏覽器的擴充功能。

開發時可使用監看模式，檔案異動會自動重新打包：

```bash
npm run watch
```

型別檢查（不輸出檔案）：

```bash
npm run typecheck
```

### 在 Chrome / Brave 載入擴充功能（開發者模式）

1. 開啟 `chrome://extensions`
2. 開啟右上角「開發人員模式」
3. 點選「載入未封裝項目」，選擇本專案的 `dist/` 資料夾
4. 完成！點擊工具列上的圖示即可使用

---

## ☁️ 啟用 Google Drive 上傳（選用）

1. 前往 [Google Cloud Console](https://console.cloud.google.com/) 建立 OAuth 用戶端 ID（類型選擇 Chrome App，並填入擴充功能 ID）
2. 將取得的 Client ID 填入 `src/core/google.ts` 中的 `GOOGLE_CLIENT_ID`
3. 重新執行 `npm run build`

此模組目前提供 `authenticateWithGoogle()`、`uploadToGoogleDrive()`、`uploadToGoogleSheets()` 等函式，並透過 `background.ts` 以 `chrome.runtime.sendMessage` 的方式對外暴露（`action: "uploadTabs"` / `action: "authenticate"`），可作為後續在 popup / options 加上「登入 Google」按鈕時的基礎。

---

## 🗺️ 後續規劃（Roadmap）

- [ ] 在 popup / options 加入「登入 Google」與「上傳到 Drive」按鈕
- [ ] 支援自訂 Google Sheets ID，直接寫入試算表
- [ ] 加入單元測試（Vitest）
- [ ] 加入 ESLint + Prettier 統一程式碼風格
- [ ] 支援匯出至 Markdown 格式

---

## 📜 版本紀錄

詳見 [`CHANGELOG.md`](CHANGELOG.md)。

---

## 授權

MIT License © 2025 [Inmovative](LICENSE)
