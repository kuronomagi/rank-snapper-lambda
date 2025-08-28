// src/config.ts
import * as dotenv from "dotenv";
import { randomBytes } from "crypto";
import type { Config } from "./types";

dotenv.config();

// 環境変数からの取得と、デフォルト値の設定
const config: Config = {
  // スクレイピング対象URL
  RAKUTEN_URL: process.env.RAKUTEN_URL,
  AMAZON_URL: process.env.AMAZON_URL,

  // Google Drive設定
  GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID:
    process.env.GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID,
  GOOGLE_DRIVE_HTML_FOLDER_ID: process.env.GOOGLE_DRIVE_HTML_FOLDER_ID,
  GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON,

  // パス設定
  CHROMIUM_PATH: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  TEMP_DIR: "/tmp",
  FONTS_DIR: process.env.FONTS_DIR || "/opt/fonts",

  // スクリーンショット設定
  FILE_SHORT_ID: randomBytes(1).toString("hex"),
  WINDOW_SIZE: {
    width: 1920,
    height: 1080,
  },

  // その他の設定
  DEBUG: process.env.DEBUG === "true",
  MAX_ITEMS: parseInt(process.env.MAX_ITEMS || "30", 10),
};

// 追加の定数設定
export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
export const GOOGLE_APPLICATION_CREDENTIALS =
  process.env.GOOGLE_APPLICATION_CREDENTIALS;

export default config;
