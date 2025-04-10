// src/browser.js
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');
const config = require('./config');

/**
 * ブラウザインスタンスを初期化
 * @returns {Promise<Object>} ブラウザインスタンス
 */
async function initializeBrowser() {
  console.log('[INFO] Initializing Puppeteer browser for Lambda...');

  // @sparticuz/chromiumの実行パスを取得
  const executablePath = process.env.NODE_ENV === 'production'
    ? await chromium.executablePath()
    : config.CHROMIUM_PATH;

  // 標準的なブラウザ引数
  const defaultArgs = [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    `--window-size=${config.WINDOW_SIZE.width},${config.WINDOW_SIZE.height}`
  ];

  // Lambdaで実行する場合の追加引数
  const lambdaArgs = process.env.NODE_ENV === 'production'
    ? chromium.args
    : [];

  const browserOptions = {
    args: [...defaultArgs, ...lambdaArgs],
    defaultViewport: {
      width: config.WINDOW_SIZE.width,
      height: config.WINDOW_SIZE.height
    },
    executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true
  };

  // デバッグモードの場合は詳細ログを出力
  if (config.DEBUG) {
    console.log('[DEBUG] Browser options:', JSON.stringify(browserOptions, null, 2));
  }

  try {
    const browser = await puppeteer.launch(browserOptions);
    return browser;
  } catch (error) {
    console.error('[ERROR] Failed to initialize browser:', error);
    throw error;
  }
}

/**
 * Stealth mode - ボットと検出されにくくするための設定
 * @param {Object} page Puppeteerのページオブジェクト
 */
async function setupStealthMode(page) {
  console.log('[INFO] Setting up stealth mode...');

  await page.evaluateOnNewDocument(() => {
    // WebDriverを偽装
    Object.defineProperty(navigator, 'webdriver', { get: () => false });

    // 言語設定
    Object.defineProperty(navigator, 'languages', { get: () => ['ja-JP', 'ja'] });

    // プラグイン偽装
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        return {
          length: 0,
          item: (i) => null,
          namedItem: (n) => null,
          refresh: () => {}
        };
      }
    });

    // Chrome機能を偽装
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );

    // プラットフォーム設定
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
  });

  // ユーザーエージェント設定
  await page.setUserAgent(config.USER_AGENT);

  // その他のヘッダー設定
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7'
  });
}

module.exports = {
  initializeBrowser,
  setupStealthMode
};
