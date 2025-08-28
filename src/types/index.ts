// 共通の型定義

export interface Config {
  // URLs
  RAKUTEN_URL?: string;
  AMAZON_URL?: string;

  // Google Drive
  GOOGLE_DRIVE_SCREENSHOT_FOLDER_ID?: string;
  GOOGLE_DRIVE_HTML_FOLDER_ID?: string;
  GOOGLE_CREDENTIALS_JSON?: string;

  // Paths
  TEMP_DIR: string;
  CHROMIUM_PATH: string;
  FONTS_DIR: string;

  // Settings
  WINDOW_SIZE: WindowSize;
  DEBUG: boolean;
  MAX_ITEMS: number;
  FILE_SHORT_ID: string;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface ScraperOptions {
  keyword: string | null;
  storeCode: string | null;
}

export interface Rank1ItemData {
  url: string | null;
  title: string | null;
}

export interface ScraperResult {
  success: boolean;
  html_content: string | null;
  condition_met: boolean;
  error?: string;
  errorTime?: string;
  google_drive?: GoogleDriveInfo;
  skipped?: boolean;
  message?: string;
}

export interface GoogleDriveInfo {
  html_id?: string;
  html_url?: string;
  screenshot_id?: string;
  screenshot_url?: string;
}

export interface ScraperResults {
  rakuten?: ScraperResult;
  amazon?: ScraperResult;
}

export interface LambdaEvent {
  rakutenUrl?: string;
  amazonUrl?: string;
  keyword?: string;
  storeCode?: string;
}

export interface LambdaContext {
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  awsRequestId: string;
  logGroupName: string;
  logStreamName: string;
}

export interface LambdaResponse {
  statusCode: number;
  body: string;
}

export interface GoogleDriveMetadata {
  id: string;
  name: string;
  webViewLink?: string;
}
