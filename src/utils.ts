// src/utils.ts
import { promises as fs } from "fs";
import * as path from "path";
import type { Page } from "puppeteer-core";
import config from "./config";

/**
 * 現在のタイムスタンプを取得
 * @returns YYYYMMDDHHmmSS形式のタイムスタンプ
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString().replace(/[-:T]/g, "").substring(0, 14);
}

/**
 * HTMLコンテンツをファイルに保存
 * @param content HTMLコンテンツ
 * @param filename ファイル名
 * @returns 保存されたファイルパス
 */
export async function saveHtmlToFile(
  content: string,
  filename: string
): Promise<string> {
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
 * @param directoryPath 作成するディレクトリパス
 */
export async function ensureDirectoryExists(
  directoryPath: string
): Promise<void> {
  try {
    await fs.access(directoryPath);
  } catch (error: any) {
    // ディレクトリが存在しない場合は作成
    if (error.code === "ENOENT") {
      await fs.mkdir(directoryPath, { recursive: true });
      console.log(`[INFO] Created directory: ${directoryPath}`);
    } else {
      throw error;
    }
  }
}

/**
 * 一時ファイルを削除
 * @param filePath 削除するファイルパス
 */
export async function removeFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
    console.log(`[INFO] Removed file: ${filePath}`);
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      console.warn(`[WARN] Failed to remove file ${filePath}:`, error);
    }
  }
}

/**
 * エラー発生時にデバッグ情報を保存
 * @param page Puppeteerのページオブジェクト
 * @param platformName プラットフォーム名
 * @returns 保存されたファイルパスの配列
 */
export async function saveDebugInfoOnError(
  page: Page | null,
  platformName: string
): Promise<string[]> {
  if (!page) return [];

  const errorFiles: string[] = [];

  try {
    const timestamp = getCurrentTimestamp();
    const errorScreenshotPath = path.join(
      config.TEMP_DIR,
      `error_${platformName}_${timestamp}.png`
    );
    const errorHtmlPath = path.join(
      config.TEMP_DIR,
      `error_${platformName}_${timestamp}.html`
    );

    console.log("[DEBUG] Attempting to save error debug info...");

    // スクリーンショットを保存
    await page.screenshot({
      path: errorScreenshotPath,
      fullPage: true,
    });
    errorFiles.push(errorScreenshotPath);

    // HTMLを保存
    const htmlContent = await page.content();
    await saveHtmlToFile(htmlContent, path.basename(errorHtmlPath));
    errorFiles.push(errorHtmlPath);

    console.log("[DEBUG] Saved error debug info:", errorFiles);
    return errorFiles;
  } catch (error) {
    console.warn("[WARN] Failed to save debug info on error:", error);
    return errorFiles;
  }
}
