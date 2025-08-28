// src/config.js
require('dotenv').config();
const { randomBytes } = require('crypto');

// 環境変数からの取得と、デフォルト値の設定
module.exports = {
  // スクレイピング対象URL (デフォルト値として使用される)
  RAKUTEN_URL: 'https://ranking.rakuten.co.jp/daily/215373',
  AMAZON_URL: 'https://www.amazon.co.jp/gp/bestsellers/pet-supplies/2155373051',

  // Google Drive設定
  GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID: process.env.GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID,
  GOOGLE_DRIVE_HTML_FOLDER_ID: process.env.GOOGLE_DRIVE_HTML_FOLDER_ID,
  GOOGLE_CREDENTIALS_JSON: process.env.GOOGLE_CREDENTIALS_JSON,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,

  // ローカル開発用Chromiumのパス（本番環境ではSparticuzのパスを使用）
  CHROMIUM_PATH: process.env.CHROMIUM_PATH || '/usr/bin/chromium',

  // スクリーンショット設定
  FILE_SHORT_ID: randomBytes(1).toString('hex'),
  WINDOW_SIZE: {
    width: 1920,
    height: 1080
  },

  // Lambda関連
  TEMP_DIR: '/tmp',

  // デバッグ
  DEBUG: process.env.DEBUG === 'true',

  // ブラウザオプション
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',

  // 最大取得アイテム数
  MAX_ITEMS: process.env.MAX_ITEMS || 30
};
