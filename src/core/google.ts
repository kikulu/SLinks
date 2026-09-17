/**
 * Google OAuth 授權，以及上傳到 Google Drive / Google Sheets 的邏輯。
 *
 * 使用前請先在 Google Cloud Console 建立 OAuth Client ID（類型：Chrome App），
 * 並將下方 GOOGLE_CLIENT_ID 換成你自己的憑證。
 */
import { TabRecord } from "../types";
import { getAccessToken, getTimestamp, setAccessToken } from "./storage";

const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_OAUTH_CLIENT_ID.apps.googleusercontent.com";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

function getRedirectUri(): string {
  return `https://${chrome.runtime.id}.chromiumapp.org`;
}

/** 透過 chrome.identity.launchWebAuthFlow 進行 Google OAuth 授權 */
export async function authenticateWithGoogle(): Promise<string> {
  const authUrl =
    "https://accounts.google.com/o/oauth2/auth" +
    `?client_id=${GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(getRedirectUri())}` +
    "&response_type=token" +
    `&scope=${encodeURIComponent(DRIVE_SCOPE)}`;

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, (redirectUrl) => {
      if (chrome.runtime.lastError || !redirectUrl) {
        reject(new Error(chrome.runtime.lastError?.message ?? "Google 授權失敗"));
        return;
      }
      const token = new URL(redirectUrl).hash
        .slice(1)
        .split("&")
        .map((part) => part.split("="))
        .find(([key]) => key === "access_token")?.[1];

      if (!token) {
        reject(new Error("未取得 access token"));
        return;
      }
      setAccessToken(token).then(() => resolve(token));
    });
  });
}

/** 將網址清單以純文字檔上傳到 Google Drive */
export async function uploadToGoogleDrive(urls: string[]): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("尚未登入 Google！");
  }

  const content = urls.map((url) => `${getTimestamp()} - ${url}`).join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const formData = new FormData();
  formData.append("file", blob, `tabs_links_${getTimestamp()}.txt`);

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error(`上傳至 Google Drive 失敗（HTTP ${response.status}）`);
  }
}

/** 將分頁資訊附加到指定的 Google Sheets 試算表 */
export async function uploadToGoogleSheets(tabs: TabRecord[], sheetId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("尚未登入 Google！");
  }

  const values = tabs.map((tab) => [tab.timestamp, tab.title, tab.url]);

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=RAW`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values }),
    }
  );

  if (!response.ok) {
    throw new Error(`寫入 Google Sheets 失敗（HTTP ${response.status}）`);
  }
}
