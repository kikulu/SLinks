# AI 參與度 ☕

烘焙深度：用咖啡「杯數」表示 AI 介入程度。
AI做越多，人需要喝的咖啡就越少。

# 🔖 SLinks – Tabs Exporter

[![CI](https://github.com/your-username/tabs-exporter/actions/workflows/ci.yml/badge.svg)](https://github.com/your-username/tabs-exporter/actions/workflows/ci.yml)

匯出你的分頁到 CSV / TXT，或上傳到 Google Drive。

一款簡潔實用的 Chrome / Brave 擴充功能，讓你能夠選取目前開啟的分頁，並將其匯出為 `.csv` 或 `.txt` 檔案，或直接上傳至 Google Drive。支援完整標題、URL、時間戳與頁面摘要（meta description）！

本專案為原本以純 JavaScript 撰寫的擴充功能重構版，改以 **TypeScript** 開發、使用 **Rollup** 打包，並整理成標準的 Manifest V3 專案結構。

---

## ✨ 功能特色

- ✅ 選取目前開啟的分頁並匯出
- 📄 支援匯出為 `.csv`、`.txt`、`.md`（Markdown，可在設定頁切換預設格式）
- 🕒 自動加入當前時間戳（完整 ISO 格式）
- 📝 擷取每個分頁的 meta description 作為摘要（CSV / Markdown 匯出時可用）
- ☁️ 內建 Google OAuth 授權，可在 popup / 設定頁登入、登出 Google
- ⬆️ 一鍵將選取的分頁上傳到 **Google Drive**（純文字檔）或 **Google Sheets**（附加到指定試算表，首次使用會自動建立 `Timestamp / Title / URL` 表頭列）
- ⏱️ 支援「自動上傳」：可設定間隔（15 / 30 / 60 / 180 分鐘），由背景頁以 `chrome.alarms` 定期將目前所有分頁上傳
- 📶 離線時自動將待上傳分頁暫存，恢復連線後自動重試
- 🧠 自動排除無法存取的系統頁面（如 `chrome://`），並以灰階顯示
- 🎨 現代化 UI，支援 Google Fonts
- 🧪 以 Vitest 撰寫的單元測試，涵蓋匯出格式、Google 上傳、自動上傳排程等邏輯
- 🧹 ESLint + Prettier 統一程式碼風格
- 🤖 GitHub Actions CI，每次 push / PR 自動執行 typecheck / lint / format check / test / build

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
├── .github/workflows/ci.yml  # GitHub Actions CI
├── src/
│   ├── manifest.json         # 擴充功能設定檔
│   ├── types.ts              # 共用型別定義
│   ├── background.ts         # Service Worker 進入點
│   ├── core/
│   │   ├── storage.ts        # chrome.storage 封裝
│   │   ├── export.ts         # TXT / CSV / Markdown 產生與下載
│   │   ├── google.ts         # Google OAuth / Drive / Sheets
│   │   ├── tabs.ts           # 分頁相關共用工具（popup / background 共用）
│   │   ├── schedule.ts       # 自動上傳排程的純邏輯
│   │   └── __tests__/        # Vitest 單元測試
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.ts          # 彈出視窗邏輯（含 Google 登入 / 登出 / 上傳）
│   └── options/
│       ├── options.html
│       ├── options.css
│       └── options.ts        # 設定頁邏輯（含上傳方式 / Sheets ID / 自動上傳 / 登入登出）
├── icons/                    # 擴充功能圖示
├── docs/                     # 開發文件
├── dist/                     # 建置輸出（git 已忽略，執行 npm run build 產生）
├── eslint.config.mjs
├── .prettierrc.json
├── vitest.config.ts
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

執行單元測試（Vitest）：

```bash
npm run test        # 執行一次
npm run test:watch  # 監看模式
```

程式碼風格檢查與自動修正：

```bash
npm run lint        # 檢查
npm run lint:fix    # 自動修正
npm run format      # 以 Prettier 格式化
npm run format:check
```

### 在 Chrome / Brave 載入擴充功能（開發者模式）

1. 開啟 `chrome://extensions`
2. 開啟右上角「開發人員模式」
3. 點選「載入未封裝項目」，選擇本專案的 `dist/` 資料夾
4. 完成！點擊工具列上的圖示即可使用

---

## ☁️ 啟用 Google Drive / Sheets 上傳

1. 前往 [Google Cloud Console](https://console.cloud.google.com/) 建立 OAuth 用戶端 ID（類型選擇 Chrome App，並填入擴充功能 ID）
2. 將取得的 Client ID 填入 `src/core/google.ts` 中的 `GOOGLE_CLIENT_ID`
3. 重新執行 `npm run build`，並重新載入擴充功能

設定完成後：

1. 在**設定頁**（右鍵擴充功能圖示 → 選項，或在 popup 直接點「登入 Google」）點擊「登入 Google」完成 OAuth 授權；不需要時可點「登出 Google」撤銷授權並清除本機 token
2. 在設定頁的「上傳方式」選擇：
   - **Google Drive**：選取的分頁會以純文字檔（含時間戳與網址）上傳到你的 Google Drive
   - **Google Sheets**：需額外填入「Google Sheets ID」（試算表網址中 `/d/` 與 `/edit` 之間的字串），每次上傳會將 `時間戳 / 標題 / 網址` 附加到該試算表**第一個工作表（Sheet1）**；若該工作表目前是空的，會先自動寫入 `Timestamp / Title / URL` 表頭列
3. 回到 popup，勾選要上傳的分頁，點擊「上傳選取分頁」即可

若上傳當下裝置處於離線狀態，擴充功能會自動將待上傳的分頁暫存起來，等網路恢復後由背景頁自動重試，不需手動再次操作。

### 自動上傳

在設定頁勾選「定期自動上傳目前所有分頁」，並選擇間隔時間（15 / 30 / 60 / 180 分鐘）後，背景頁會透過 `chrome.alarms` 定期將**目前所有分頁**（排除 `chrome://` 等受限頁面）依上方選擇的方式自動上傳，不需要打開 popup。此功能僅在「上傳方式」不是「不上傳」時才可啟用；若改回「不上傳」，自動上傳會一併關閉。

相關程式碼位於 `src/core/google.ts`（OAuth / Drive / Sheets API 呼叫）、`src/core/schedule.ts`（自動上傳排程的純邏輯）與 `src/background.ts`（依設定路由到對應的上傳方式、離線佇列重試、`chrome.alarms` 排程管理）。

---

## 🗺️ 後續規劃（Roadmap）

- [x] 在 popup / options 加入「登入 Google」與「上傳到 Drive」按鈕
- [x] 支援自訂 Google Sheets ID，直接寫入試算表
- [x] 加入單元測試（Vitest）
- [x] 加入 ESLint + Prettier 統一程式碼風格
- [x] 支援匯出至 Markdown 格式
- [x] 支援「自動上傳」（可設定間隔，由 `chrome.alarms` 定期觸發）
- [x] popup / options 加上「登出 Google」按鈕
- [x] 加入 CI（GitHub Actions）自動執行 typecheck / lint / format check / test / build
- [x] Google Sheets 上傳前自動偵測並建立表頭列（Timestamp / Title / URL）
- [ ] 支援多組 Google Sheets ID／上傳目的地設定檔（profile）
- [ ] 加入 GitHub Actions 的自動發佈（打包 dist 為 zip 並附加到 Release）

---

## 📜 版本紀錄

詳見 [`CHANGELOG.md`](CHANGELOG.md)。

---

## 授權

MIT License © 2025 [Inmovative](LICENSE)
