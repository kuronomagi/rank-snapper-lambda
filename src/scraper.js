// src/scraper.js
const path = require('path');
const { initializeBrowser, setupStealthMode } = require('./browser');
const { uploadToGoogleDrive } = require('./google-drive');
const { getCurrentTimestamp, saveHtmlToFile, removeFile, saveDebugInfoOnError } = require('./utils');
const config = require('./config');

/**
 * スクレイピングとスクリーンショット取得の実行
 * @returns {Promise<Object>} 実行結果
 */
async function snapperRankings() {
  const results = {};

  console.log('[INFO] Starting ranking snapshot process...');

  // 楽天のスナップショット取得
  console.log('[INFO] Starting Rakuten snapshot...');
  results.rakuten = await snapperPlatform('rakuten', config.RAKUTEN_URL);

  // Amazonのスナップショット取得
  console.log('[INFO] Starting Amazon snapshot...');
  results.amazon = await snapperPlatform('amazon', config.AMAZON_URL);

  console.log('[INFO] Snapshot process finished.');
  return results;
}

/**
 * 特定プラットフォームのスクレイピングとスクリーンショット取得
 * @param {string} platformName プラットフォーム名（'rakuten'または'amazon'）
 * @param {string} url スクレイピング対象のURL
 * @returns {Promise<Object>} 実行結果
 */
async function snapperPlatform(platformName, url) {
  let browser = null;
  let page = null;

  try {
    // ブラウザの初期化
    browser = await initializeBrowser();
    page = await browser.newPage();

    // ステルスモードの設定
    await setupStealthMode(page);

    console.log(`[INFO] Navigating to ${url} for ${platformName}`);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // ページの読み込み完了を待機
    await new Promise(resolve => setTimeout(resolve, 2000)); // レンダリング待ち

    // タイムスタンプとファイル名の作成
    const timestamp = getCurrentTimestamp();
    const filenameBase = `${timestamp}_${platformName}_snapshot`;
    const screenshotFilename = `${filenameBase}.png`;
    const htmlFilename = `${filenameBase}.html`;

    // 一時保存用のパス
    const screenshotPath = path.join(config.TEMP_DIR, screenshotFilename);
    const htmlPath = path.join(config.TEMP_DIR, htmlFilename);

    // HTMLの保存
    console.log(`[INFO] Saving HTML to ${htmlPath}`);
    const htmlContent = await page.content();
    await saveHtmlToFile(htmlContent, htmlFilename);

    // スクリーンショットの取得
    console.log(`[INFO] Taking screenshot and saving to ${screenshotPath}`);
    await page.screenshot({
      path: screenshotPath,
      fullPage: platformName === 'amazon' // Amazonはフルページ、楽天は表示領域のみ
    });

    // Google Driveにアップロード
    try {
      // スクリーンショットをGoogle Driveにアップロード
      const screenshotMetadata = await uploadToGoogleDrive(
        screenshotPath,
        `${platformName}_screenshot`,
        config.GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID,
        'png'
      );
      console.log(`[INFO] Screenshot uploaded to Google Drive with ID: ${screenshotMetadata.id}`);

      // HTMLをGoogle Driveにアップロード
      const htmlMetadata = await uploadToGoogleDrive(
        htmlPath,
        `${platformName}_html`,
        config.GOOGLE_DRIVE_HTML_FOLDER_ID,
        'html'
      );
      console.log(`[INFO] HTML uploaded to Google Drive with ID: ${htmlMetadata.id}`);

      // 結果を返す
      return {
        success: true,
        google_drive: {
          screenshot_id: screenshotMetadata.id,
          screenshot_url: `https://drive.google.com/file/d/${screenshotMetadata.id}`,
          html_id: htmlMetadata.id,
          html_url: `https://drive.google.com/file/d/${htmlMetadata.id}`
        }
      };
    } catch (driveError) {
      console.error(`[ERROR] Failed to upload to Google Drive: ${driveError.message}`);
      console.error(`[ERROR] Backtrace: ${driveError.stack}`);
      return {
        success: false,
        error: `Google Drive upload failed: ${driveError.message}`
      };
    } finally {
      // 一時ファイルを削除
      await removeFile(screenshotPath);
      await removeFile(htmlPath);
    }
  } catch (error) {
    console.error(`[ERROR] Error during ${platformName} snapshot: ${error.message}`);
    console.error(`[ERROR] Backtrace: ${error.stack}`);

    // エラー発生時にスクリーンショットやHTMLを保存
    let errorFiles = [];
    if (page) {
      errorFiles = await saveDebugInfoOnError(page, platformName);

      // エラー情報もGoogle Driveにアップロード
      if (errorFiles.length > 0) {
        try {
          for (const filePath of errorFiles) {
            const fileName = path.basename(filePath);
            const fileNameWithoutExt = path.basename(filePath, path.extname(filePath));
            const extension = path.extname(filePath).replace('.', '');

            await uploadToGoogleDrive(
              filePath,
              `error_${fileNameWithoutExt}`,
              config.GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID,
              extension
            );
            console.log(`[INFO] Error debug file uploaded to Google Drive: ${fileName}`);
          }
        } catch (uploadError) {
          console.error(`[ERROR] Failed to upload error files to Google Drive: ${uploadError.message}`);
        } finally {
          // エラーファイルを削除
          for (const filePath of errorFiles) {
            await removeFile(filePath);
          }
        }
      }
    }

    return {
      success: false,
      error: error.message,
      errorTime: new Date().toISOString()
    };
  } finally {
    // ブラウザを確実に閉じる
    if (browser) {
      console.log(`[INFO] Quitting browser for ${platformName}`);
      await browser.close();
    }
  }
}

module.exports = {
  snapperRankings,
  snapperPlatform
};
