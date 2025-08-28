// src/scraper.ts
import * as path from "path";
import type { Page, Browser } from "puppeteer-core";
import { initializeBrowser, setupStealthMode } from "./browser";
import { uploadToGoogleDrive } from "./google-drive";
import {
  getCurrentTimestamp,
  saveHtmlToFile,
  removeFile,
  saveDebugInfoOnError,
} from "./utils";
import config from "./config";
import type {
  ScraperResults,
  ScraperResult,
  Rank1ItemData,
  ScraperOptions,
} from "./types";

/**
 * スクレイピングとスクリーンショット取得の実行
 * @param rakutenUrl 楽天のURL
 * @param amazonUrl AmazonのURL
 * @param keyword 条件チェック用キーワード
 * @param storeCode 条件チェック用ストアコード
 * @returns 実行結果
 */
export async function snapperRankings(
  rakutenUrl?: string,
  amazonUrl?: string,
  keyword: string | null = null,
  storeCode: string | null = null
): Promise<ScraperResults> {
  const results: ScraperResults = {};
  const options: ScraperOptions = { keyword, storeCode };

  console.log("[INFO] Starting ranking snapshot process...");

  // --- 楽天の処理 (URLが存在する場合のみ) ---
  if (rakutenUrl) {
    console.log(
      `[INFO] Starting Rakuten processing (Keyword: ${
        keyword || "N/A"
      }, StoreCode: ${storeCode || "N/A"})...`
    );
    try {
      results.rakuten = await snapperPlatform("rakuten", rakutenUrl, options);
    } catch (e: any) {
      console.error(
        `[ERROR] Uncaught error during Rakuten processing: ${e.message}`
      );
      results.rakuten = {
        success: false,
        error: `Uncaught error: ${e.message}`,
        html_content: null,
        condition_met: false,
      };
    }
  } else {
    console.log("[INFO] Skipping Rakuten processing: URL not provided.");
    results.rakuten = {
      success: true,
      html_content: null,
      condition_met: false,
      skipped: true,
      message: "URL not provided",
    };
  }

  // --- Amazonの処理 (URLが存在する場合のみ) ---
  if (amazonUrl) {
    console.log(
      `[INFO] Starting Amazon processing (Keyword: ${
        keyword || "N/A"
      }, StoreCode: ${storeCode || "N/A"})...`
    );
    try {
      results.amazon = await snapperPlatform("amazon", amazonUrl, options);
    } catch (e: any) {
      console.error(
        `[ERROR] Uncaught error during Amazon processing: ${e.message}`
      );
      results.amazon = {
        success: false,
        error: `Uncaught error: ${e.message}`,
        html_content: null,
        condition_met: false,
      };
    }
  } else {
    console.log("[INFO] Skipping Amazon processing: URL not provided.");
    results.amazon = {
      success: true,
      html_content: null,
      condition_met: false,
      skipped: true,
      message: "URL not provided",
    };
  }

  console.log("[INFO] Snapshot process finished.");
  return results;
}

/**
 * 特定プラットフォームのスクレイピングとスクリーンショット取得
 * @param platformName プラットフォーム名
 * @param url スクレイピング対象URL
 * @param options オプション ({ keyword, storeCode })
 * @returns 実行結果
 */
export async function snapperPlatform(
  platformName: "rakuten" | "amazon",
  url: string,
  options: ScraperOptions = { keyword: null, storeCode: null }
): Promise<ScraperResult> {
  const { keyword, storeCode } = options;
  let browser: Browser | null = null;
  let page: Page | null = null;
  let htmlContent: string | null = null;
  let screenshotPath: string | null = null;
  let htmlPath: string | null = null;
  let htmlMetadata: any = null;
  let screenshotMetadata: any = null;
  let conditionMet = false; // 条件を満たしたかのフラグ

  try {
    browser = await initializeBrowser();
    page = await browser.newPage();
    await setupStealthMode(page);

    console.log(`[INFO] Navigating to ${url} for ${platformName}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const timestamp = getCurrentTimestamp();
    const filenameBase = `${timestamp}_${platformName}_snapshot`;

    // HTML取得 & ローカル保存 (常に実行)
    const htmlFilename = `${filenameBase}.html`;
    htmlPath = path.join(config.TEMP_DIR, htmlFilename);
    console.log(`[INFO] Getting HTML content for ${platformName}`);
    htmlContent = await page.content();
    console.log(`[INFO] Saving HTML to ${htmlPath}`);
    await saveHtmlToFile(htmlContent, htmlFilename);

    // --- 条件チェック ---
    // キーワードが指定されている場合のみチェックを実行
    if (keyword) {
      console.log(
        `[INFO] Checking conditions for keyword "${keyword}" and storeCode "${
          storeCode || "N/A"
        }" on ${platformName}`
      );
      const rank1Item = await getRank1ItemData(page, platformName);

      if (rank1Item) {
        console.log(
          `[INFO] Rank 1 item found: URL=${rank1Item.url}, Title=${rank1Item.title}`
        );

        // 条件A: 楽天の場合のみ、storeCodeが指定されていればURLに含まれるかチェック
        // Amazonの場合、またはstoreCodeが指定されていない場合はtrueとする
        let urlCondition = true;
        if (platformName === "rakuten" && storeCode) {
          urlCondition = rank1Item.url?.includes(`/${storeCode}/`) ?? false;
        }

        // 条件B: タイトルにキーワードが含まれるかチェック
        const titleCondition = rank1Item.title?.includes(keyword) ?? false;

        // 条件AとBの両方を満たす場合のみ conditionMet = true
        if (urlCondition && titleCondition) {
          conditionMet = true;
        }

        // ログ出力
        let logMsg = "[INFO] Condition check result:";
        if (platformName === "rakuten") {
          logMsg += ` URL(${storeCode || "N/A"}) match=${urlCondition},`;
        }
        logMsg += ` Title(${keyword}) match=${titleCondition}`;
        logMsg += ` => Condition Met = ${conditionMet}`;
        console.log(logMsg);
      } else {
        console.warn(
          "[WARN] Could not find Rank 1 item data for condition check."
        );
      }
    } else {
      console.log("[INFO] Keyword not provided, skipping condition check.");
    }

    // --- スクリーンショット処理 (条件を満たした場合のみ) ---
    if (conditionMet) {
      const screenshotFilename = `${filenameBase}.png`;
      screenshotPath = path.join(config.TEMP_DIR, screenshotFilename);
      console.log(
        `[INFO] Taking screenshot because conditions met, saving to ${screenshotPath}`
      );
      await page.screenshot({
        path: screenshotPath,
        fullPage: platformName === "amazon",
      });
    } else {
      console.log(`[INFO] Skipping screenshot because conditions not met.`);
    }

    try {
      // --- Google Drive へのアップロード ---
      // HTMLとスクリーンショットの両方を conditionMet で判断
      if (conditionMet && htmlPath) {
        console.log(`[INFO] Uploading HTML to Google Drive (condition met)...`);
        htmlMetadata = await uploadToGoogleDrive(
          htmlPath,
          `${platformName}_html_${timestamp}`,
          config.GOOGLE_DRIVE_HTML_FOLDER_ID!,
          "html"
        );
        console.log(`[INFO] HTML uploaded. ID: ${htmlMetadata.id}`);
      } else {
        console.log(
          `[INFO] Skipping HTML upload to Google Drive (condition not met).`
        );
      }

      if (conditionMet && screenshotPath) {
        console.log(
          `[INFO] Uploading screenshot to Google Drive (condition met)...`
        );
        screenshotMetadata = await uploadToGoogleDrive(
          screenshotPath,
          `${platformName}_screenshot_${timestamp}`,
          config.GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID!,
          "png"
        );
        console.log(`[INFO] Screenshot uploaded. ID: ${screenshotMetadata.id}`);
      }

      // --- 戻り値の作成 ---
      const result: ScraperResult = {
        success: true,
        html_content: htmlContent,
        condition_met: conditionMet,
        google_drive: {},
      };

      // 条件を満たしてアップロード成功した場合のみ情報を追加
      if (conditionMet) {
        if (htmlMetadata) {
          result.google_drive!.html_id = htmlMetadata.id;
          result.google_drive!.html_url = `https://drive.google.com/file/d/${htmlMetadata.id}`;
        }
        if (screenshotMetadata) {
          result.google_drive!.screenshot_id = screenshotMetadata.id;
          result.google_drive!.screenshot_url = `https://drive.google.com/file/d/${screenshotMetadata.id}`;
        }
      }

      console.log(
        `[INFO] Successfully processed ${platformName}. Returning result.`
      );
      return result;
    } catch (driveError: any) {
      console.error(
        `[ERROR] Failed to upload to Google Drive: ${driveError.message}`
      );
      console.error(`[ERROR] Backtrace: ${driveError.stack}`);
      return {
        success: false,
        html_content: htmlContent,
        condition_met: conditionMet,
        error: `Google Drive upload failed: ${driveError.message}`,
      };
    } finally {
      // 一時ファイル削除 (条件に関わらずローカルファイルは削除)
      if (screenshotPath) await removeFile(screenshotPath);
      if (htmlPath) await removeFile(htmlPath);
    }
  } catch (error: any) {
    console.error(
      `[ERROR] Error during ${platformName} processing: ${error.message}`
    );
    console.error(`[ERROR] Backtrace: ${error.stack}`);
    let errorFiles: string[] = [];

    if (page) {
      try {
        if (!htmlContent) htmlContent = await page.content();
      } catch (contentError) {
        console.warn(
          "[WARN] Failed to get HTML content on error:",
          contentError
        );
      }

      // エラー時のデバッグ情報保存は常に試みる
      errorFiles = await saveDebugInfoOnError(page, platformName);
      if (errorFiles.length > 0) {
        try {
          for (const filePath of errorFiles) {
            const fileName = path.basename(filePath);
            const fileNameWithoutExt = path.basename(
              filePath,
              path.extname(filePath)
            );
            const extension = path.extname(filePath).replace(".", "");
            await uploadToGoogleDrive(
              filePath,
              `error_${fileNameWithoutExt}`,
              config.GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID!,
              extension
            );
            console.log(
              `[INFO] Error debug file uploaded to Google Drive: ${fileName}`
            );
          }
        } catch (uploadError: any) {
          console.error(
            `[ERROR] Failed to upload error files to Google Drive: ${uploadError.message}`
          );
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
      condition_met: conditionMet,
      error: error.message,
      errorTime: new Date().toISOString(),
    };
  } finally {
    if (browser) {
      console.log(`[INFO] Quitting browser for ${platformName}`);
      await browser.close();
    }
  }
}

/**
 * Puppeteerを使って1位のアイテムデータを取得するヘルパー関数
 * @param page Puppeteerのページオブジェクト
 * @param platformName 'rakuten' or 'amazon'
 * @returns 1位のデータ or null
 */
async function getRank1ItemData(
  page: Page,
  platformName: "rakuten" | "amazon"
): Promise<Rank1ItemData | null> {
  console.log(`[DEBUG] Getting rank 1 item data for ${platformName}`);

  if (platformName === "rakuten") {
    // 楽天の1位要素セレクタ
    const rank1BoxSelector =
      "#rnkRankingMain div.rnkRanking_top3box:first-of-type";
    try {
      // まず1位のボックス要素を取得
      const rank1Box = await page.waitForSelector(rank1BoxSelector, {
        timeout: 5000,
      });
      if (!rank1Box) {
        console.warn(
          `[WARN] Rank 1 box selector not found: ${rank1BoxSelector}`
        );
        return null;
      }

      // ボックスの中からURLとタイトルを取得
      const urlSelector = ".rnkRanking_itemName a";
      const titleSelector = ".rnkRanking_itemName a";

      const url = await rank1Box
        .$eval(urlSelector, (el) => el.getAttribute("href"))
        .catch(() => null);
      const title = await rank1Box
        .$eval(titleSelector, (el) => el.textContent?.trim() ?? null)
        .catch(() => null);

      return { url, title };
    } catch (e: any) {
      console.error(
        `[ERROR] Failed to get rank 1 item data for Rakuten: ${e.message}`
      );
      return null;
    }
  } else if (platformName === "amazon") {
    // Amazonの1位要素セレクタ
    const rank1ItemSelector =
      '#gridItemRoot:first-of-type div[id^="p13n-asin-index-0"]';
    try {
      const rank1Item = await page.waitForSelector(rank1ItemSelector, {
        timeout: 5000,
      });
      if (!rank1Item) {
        console.warn(
          `[WARN] Rank 1 item selector not found: ${rank1ItemSelector}`
        );
        return null;
      }

      const urlSelector = 'a.a-link-normal[href*="/dp/"]';
      const titleSelector =
        'a.a-link-normal[href*="/dp/"] span > div[class*="line-clamp"]';

      const urlRaw = await rank1Item
        .$eval(urlSelector, (el) => el.getAttribute("href"))
        .catch(() => null);
      const url = urlRaw
        ? `https://www.amazon.co.jp${urlRaw.split("/ref=")[0]}`
        : null;
      const title = await rank1Item
        .$eval(titleSelector, (el) => el.textContent?.trim() ?? null)
        .catch(() => null);

      return { url, title };
    } catch (e: any) {
      console.error(
        `[ERROR] Failed to get rank 1 item data for Amazon: ${e.message}`
      );
      return null;
    }
  } else {
    console.warn(
      `[WARN] Unsupported platform for condition check: ${platformName}`
    );
    return null;
  }
}
