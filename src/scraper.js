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
async function snapperRankings(rakutenUrl, amazonUrl, takeScreenshot = true) {
  const results = {};

  // ★ takeScreenshot フラグを options オブジェクトに格納
  const options = { takeScreenshot };

  console.log('[INFO] Starting ranking snapshot process...');

  // --- 楽天の処理 (URLが存在する場合のみ) ---
  if (rakutenUrl) {
    console.log(`[INFO] Starting Rakuten processing (takeScreenshot: ${takeScreenshot})...`);
    try {
      results.rakuten = await snapperPlatform('rakuten', rakutenUrl, options);
    } catch (e) {
        // snapperPlatform内でエラーが捕捉され、エラー情報を含むオブジェクトが返る想定だが、
        // 予期せぬエラーで例外が投げられた場合も考慮
        console.error(`[ERROR] Uncaught error during Rakuten processing: ${e.message}`);
        results.rakuten = { success: false, error: `Uncaught error: ${e.message}`, html_content: null };
    }
  } else {
    console.log('[INFO] Skipping Rakuten processing: URL not provided.');
    results.rakuten = { skipped: true, message: 'URL not provided' }; // スキップ情報を格納
  }
  // ----------------------------------------

  // --- Amazonの処理 (URLが存在する場合のみ) ---
  if (amazonUrl) {
  console.log(`[INFO] Starting Amazon processing (takeScreenshot: ${takeScreenshot})...`);
    try {
    results.amazon = await snapperPlatform('amazon', amazonUrl, options);
  } catch (e) {
      console.error(`[ERROR] Uncaught error during Amazon processing: ${e.message}`);
      results.amazon = { success: false, error: `Uncaught error: ${e.message}`, html_content: null };
  }
  } else {
    console.log('[INFO] Skipping Amazon processing: URL not provided.');
    results.amazon = { skipped: true, message: 'URL not provided' }; // スキップ情報を格納
  }
  // -----------------------------------------

  console.log('[INFO] Snapshot process finished.');
  return results;
}

/**
 * 特定プラットフォームのスクレイピングとスクリーンショット取得
 * @param {string} platformName プラットフォーム名（'rakuten'または'amazon'）
 * @param {string} url スクレイピング対象のURL
 * @param {object} options オプション ({ takeScreenshot: boolean })
 * @returns {Promise<Object>} 実行結果
 */
//
async function snapperPlatform(platformName, url, options = { takeScreenshot: true }) {
  // ★ オプションから takeScreenshot フラグを取得
  const { takeScreenshot } = options;
  let browser = null;
  let page = null;
  let htmlContent = null;
  let screenshotPath = null; // スクリーンショットのパスを保持
  let htmlPath = null;     // HTMLのパスを保持
  let htmlMetadata = null;
  let screenshotMetadata = null;

  try {
    browser = await initializeBrowser();
    page = await browser.newPage();
    await setupStealthMode(page);

    console.log(`[INFO] Navigating to ${url} for ${platformName}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 3000));

    const timestamp = getCurrentTimestamp();
    const filenameBase = `${timestamp}_${platformName}_snapshot`;

    // --- HTML処理 (常に実行) ---
    const htmlFilename = `${filenameBase}.html`;
    htmlPath = path.join(config.TEMP_DIR, htmlFilename);
    console.log(`[INFO] Getting HTML content for ${platformName}`);
    htmlContent = await page.content();
    console.log(`[INFO] Saving HTML to ${htmlPath}`);
    await saveHtmlToFile(htmlContent, htmlFilename);
    // --------------------------

    // --- スクリーンショット処理 (takeScreenshotフラグで分岐) ---
    let screenshotMetadata = null; // スクリーンショットのメタデータ用
    if (takeScreenshot) {
      const screenshotFilename = `${filenameBase}.png`;
      screenshotPath = path.join(config.TEMP_DIR, screenshotFilename);
      console.log(`[INFO] Taking screenshot and saving to ${screenshotPath}`);
      await page.screenshot({ path: screenshotPath, fullPage: platformName === 'amazon' });
    } else {
      console.log(`[INFO] Skipping screenshot for ${platformName}`);
    }
    // -------------------------------------------------------

    try {
      // --- Google Drive へのアップロード ---
      // HTMLもtakeScreenshotのフラグで管理
      if (takeScreenshot && htmlPath) {
        console.log(`[INFO] Uploading HTML to Google Drive...`);
        // ★ 上位スコープの変数に代入
        htmlMetadata = await uploadToGoogleDrive(
          htmlPath, `${platformName}_html_${timestamp}`,
          config.GOOGLE_DRIVE_HTML_FOLDER_ID, 'html'
        );
        console.log(`[INFO] HTML uploaded. ID: ${htmlMetadata.id}`);
      }

      // スクリーンショットは takeScreenshot が true の場合のみアップロード
      if (takeScreenshot && screenshotPath) {
        console.log(`[INFO] Uploading screenshot to Google Drive...`);
        // ★ 上位スコープの変数に代入
        screenshotMetadata = await uploadToGoogleDrive(
          screenshotPath, `${platformName}_screenshot_${timestamp}`,
          config.GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID, 'png'
        );
        console.log(`[INFO] Screenshot uploaded. ID: ${screenshotMetadata.id}`);
      }
      // ----------------------------------
      // --- 戻り値の作成 ---
      const result = {
        success: true,
        html_content: htmlContent, // HTMLは常に追加
        // ★ google_drive プロパティを初期化
        google_drive: {}
      };

      // ★ takeScreenshot が true で、かつアップロードが成功した場合のみ情報を追加
      if (takeScreenshot) {
        // htmlMetadata が null でないことを確認
        if (htmlMetadata) {
          result.google_drive.html_id = htmlMetadata.id;
          result.google_drive.html_url = `https://drive.google.com/file/d/${htmlMetadata.id}`;
        } else {
           console.log("[INFO] HTML metadata not available (upload skipped or failed).");
        }
        // screenshotMetadata が null でないことを確認
        if (screenshotMetadata) {
          result.google_drive.screenshot_id = screenshotMetadata.id;
          result.google_drive.screenshot_url = `https://drive.google.com/file/d/${screenshotMetadata.id}`;
        } else {
           console.log("[INFO] Screenshot metadata not available (skipped or upload failed).");
        }
      } else {
        // takeScreenshot が false の場合は google_drive は空オブジェクトのまま
        console.log("[INFO] Google Drive upload skipped as takeScreenshot is false.");
      }

      console.log(`[INFO] Successfully processed ${platformName}. Returning result.`);
      return result;
      // -------------------

    } catch (driveError) {
      console.error(`[ERROR] Failed to upload to Google Drive: ${driveError.message}`);
      console.error(`[ERROR] Backtrace: ${driveError.stack}`);
      // エラー時もHTMLは返す
      return {
        success: false,
        html_content: htmlContent,
        error: `Google Drive upload failed: ${driveError.message}`
      };
    } finally {
      // 一時ファイルを削除 (screenshotPath は存在する場合のみ削除)
      if (screenshotPath) await removeFile(screenshotPath);
      if (htmlPath) await removeFile(htmlPath); // HTMLパスも削除
    }
  } catch (error) {
    console.error(`[ERROR] Error during ${platformName} processing: ${error.message}`);
    console.error(`[ERROR] Backtrace: ${error.stack}`);
    let errorFiles = [];
    if (page) {
       try {
          if (!htmlContent) htmlContent = await page.content();
       } catch (contentError) {
          console.warn("[WARN] Failed to get HTML content on error:", contentError);
       }
       // エラー時のデバッグ情報保存は常に試みる
       errorFiles = await saveDebugInfoOnError(page, platformName);
       if (errorFiles.length > 0) {
         try {
           for (const filePath of errorFiles) {
             const fileName = path.basename(filePath);
             const fileNameWithoutExt = path.basename(filePath, path.extname(filePath));
             const extension = path.extname(filePath).replace('.', '');
             await uploadToGoogleDrive(
               filePath, `error_${fileNameWithoutExt}`,
               config.GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID, extension // エラーファイルもGdriveへ
             );
             console.log(`[INFO] Error debug file uploaded to Google Drive: ${fileName}`);
           }
         } catch (uploadError) {
           console.error(`[ERROR] Failed to upload error files to Google Drive: ${uploadError.message}`);
         } finally {
           for (const filePath of errorFiles) {
             await removeFile(filePath);
           }
         }
       }
    }
    // エラー時の戻り値 (HTMLは含める)
    return {
      success: false,
      html_content: htmlContent,
      error: error.message,
      errorTime: new Date().toISOString()
    };
  } finally {
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
