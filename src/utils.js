// src/utils.js
const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

/**
 * 現在のタイムスタンプを取得
 * @returns {string} YYYYMMDDHHmmSS形式のタイムスタンプ
 */
function getCurrentTimestamp() {
  return new Date().toISOString()
    .replace(/[-:T]/g, '')
    .substring(0, 14);
}

/**
 * HTMLコンテンツをファイルに保存
 * @param {string} content HTMLコンテンツ
 * @param {string} filename ファイル名
 * @returns {Promise<string>} 保存されたファイルパス
 */
async function saveHtmlToFile(content, filename) {
  const filePath = path.join(config.TEMP_DIR, filename);

  try {
    await fs.writeFile(filePath, content);
    console.log(`[INFO] HTML saved to ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`[ERROR] Failed to save HTML to ${filePath}:`, error);
    throw error;
  }
}

/**
 * ファイルが存在しない場合にディレクトリを作成
 * @param {string} directoryPath 作成するディレクトリパス
 * @returns {Promise<void>}
 */
async function ensureDirectoryExists(directoryPath) {
  try {
    await fs.access(directoryPath);
  } catch (error) {
    // ディレクトリが存在しない場合は作成
    if (error.code === 'ENOENT') {
      await fs.mkdir(directoryPath, { recursive: true });
      console.log(`[INFO] Created directory: ${directoryPath}`);
    } else {
      throw error;
    }
  }
}

/**
 * 一時ファイルを削除
 * @param {string} filePath 削除するファイルパス
 * @returns {Promise<void>}
 */
async function removeFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`[INFO] Removed file: ${filePath}`);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[WARN] Failed to remove file ${filePath}:`, error);
    }
  }
}

/**
 * エラー発生時にデバッグ情報を保存
 * @param {Object} page Puppeteerのページオブジェクト
 * @param {string} platformName プラットフォーム名
 * @returns {Promise<string[]>} 保存されたファイルパスの配列
 */
async function saveDebugInfoOnError(page, platformName) {
  if (!page) return [];

  const errorFiles = [];

  try {
    const timestamp = getCurrentTimestamp();
    const errorScreenshotPath = path.join(config.TEMP_DIR, `error_${platformName}_${timestamp}.png`);
    const errorHtmlPath = path.join(config.TEMP_DIR, `error_${platformName}_${timestamp}.html`);

    console.log('[DEBUG] Attempting to save error debug info...');

    // スクリーンショットを保存
    await page.screenshot({
      path: errorScreenshotPath,
      fullPage: true
    });
    errorFiles.push(errorScreenshotPath);

    // HTMLを保存
    const htmlContent = await page.content();
    await saveHtmlToFile(htmlContent, path.basename(errorHtmlPath));
    errorFiles.push(errorHtmlPath);

    console.log('[DEBUG] Saved error debug info:', errorFiles);
    return errorFiles;
  } catch (error) {
    console.warn('[WARN] Failed to save debug info on error:', error);
    return errorFiles;
  }
}

module.exports = {
  getCurrentTimestamp,
  saveHtmlToFile,
  ensureDirectoryExists,
  removeFile,
  saveDebugInfoOnError
};
