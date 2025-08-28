// src/google-drive.ts
import * as fs from "fs";
import { promises as fsPromises } from "fs";
import * as path from "path";
import { google, drive_v3 } from "googleapis";
import { JWT } from "google-auth-library";
import config, { GOOGLE_APPLICATION_CREDENTIALS } from "./config";
import type { GoogleDriveMetadata } from "./types";

/**
 * Google Drive APIサービスの初期化
 * @returns Google DriveのAPIクライアント
 */
async function initializeGoogleDriveService(): Promise<drive_v3.Drive> {
  try {
    // 認証情報の取得
    const auth = await getGoogleAuthorizer();

    // Drive APIクライアントの初期化
    const drive = google.drive({ version: "v3", auth });
    return drive;
  } catch (error) {
    console.error("[ERROR] Failed to initialize Google Drive service:", error);
    throw error;
  }
}

/**
 * Google認証情報の取得
 * @returns Google認証情報
 */
async function getGoogleAuthorizer(): Promise<JWT> {
  const scopes = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
  ];

  try {
    let credentials: any;

    // 環境変数から認証情報を取得
    if (config.GOOGLE_CREDENTIALS_JSON) {
      console.log("[INFO] Using Google credentials from environment variable");
      credentials = JSON.parse(config.GOOGLE_CREDENTIALS_JSON);
    }
    // 指定されたパスから認証情報を取得
    else if (GOOGLE_APPLICATION_CREDENTIALS) {
      console.log(
        "[INFO] Using Google credentials from path:",
        GOOGLE_APPLICATION_CREDENTIALS
      );
      const credentialsContent = await fsPromises.readFile(
        GOOGLE_APPLICATION_CREDENTIALS,
        "utf8"
      );
      credentials = JSON.parse(credentialsContent);
    }
    // 開発環境またはLambda環境で/tmpに一時的に保存されたファイルから読み込む
    else {
      const keyFilePath =
        process.env.NODE_ENV === "production"
          ? path.join(config.TEMP_DIR, "google-credentials.json")
          : "./google-credentials.json";

      console.log("[INFO] Using Google credentials from file:", keyFilePath);
      const credentialsContent = await fsPromises.readFile(keyFilePath, "utf8");
      credentials = JSON.parse(credentialsContent);
    }

    // 認証クライアントの作成
    const auth = new google.auth.JWT(
      credentials.client_email,
      undefined,
      credentials.private_key,
      scopes
    );

    // アクセストークンを取得
    await auth.authorize();
    return auth;
  } catch (error) {
    console.error("[ERROR] Failed to authorize with Google:", error);
    throw error;
  }
}

/**
 * ファイルをGoogle Driveにアップロード
 * @param filePath アップロードするファイルのパス
 * @param fileName アップロード後のファイル名（接頭辞）
 * @param folderId 保存先フォルダID
 * @param extension ファイル拡張子
 * @returns アップロードされたファイルのメタデータ
 */
export async function uploadToGoogleDrive(
  filePath: string,
  fileName: string,
  folderId: string,
  extension: string
): Promise<GoogleDriveMetadata> {
  try {
    const drive = await initializeGoogleDriveService();

    // ファイル名の作成
    const fullFileName = `${fileName}_${new Date()
      .toISOString()
      .replace(/:/g, "-")}_${config.FILE_SHORT_ID}.${extension}`;

    console.log(
      `[INFO] Uploading ${filePath} to Google Drive folder ${folderId}`
    );

    // ファイルのコンテンツタイプを判定
    const contentType = determineContentType(filePath);

    // ファイルのメタデータ
    const fileMetadata = {
      name: fullFileName,
      parents: [folderId],
    };

    // ファイルの内容を読み込む
    const media = {
      mimeType: contentType,
      body: fs.createReadStream(filePath),
    };

    // ファイルをアップロード
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id,name,webViewLink",
    });

    console.log(`[INFO] File uploaded successfully. ID: ${response.data.id}`);

    return {
      id: response.data.id!,
      name: response.data.name!,
      webViewLink: response.data.webViewLink || undefined,
    };
  } catch (error) {
    console.error("[ERROR] Failed to upload file to Google Drive:", error);
    throw error;
  }
}

/**
 * ファイルの拡張子からコンテンツタイプを判定
 * @param filePath ファイルパス
 * @returns MIMEタイプ
 */
function determineContentType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".html":
      return "text/html";
    default:
      return "application/octet-stream";
  }
}
