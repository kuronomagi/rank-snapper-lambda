// src/google-drive.js
const fs = require('fs'); // 従来のfsモジュールをインポート
const fsPromises = require('fs').promises; // PromiseベースのAPIを別名でインポート
const path = require('path');
const { google } = require('googleapis');
const config = require('./config');

/**
 * Google Drive APIサービスの初期化
 * @returns {Promise<Object>} Google DriveのAPIクライアント
 */
async function initializeGoogleDriveService() {
  try {
    // 認証情報の取得
    const auth = await getGoogleAuthorizer();

    // Drive APIクライアントの初期化
    const drive = google.drive({ version: 'v3', auth });
    return drive;
  } catch (error) {
    console.error('[ERROR] Failed to initialize Google Drive service:', error);
    throw error;
  }
}

/**
 * Google認証情報の取得
 * @returns {Promise<Object>} Google認証情報
 */
async function getGoogleAuthorizer() {
  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.file'
  ];

  try {
    let credentials;
    let keyFile;

    // 環境変数から認証情報を取得
    if (config.GOOGLE_CREDENTIALS_JSON) {
      console.log('[INFO] Using Google credentials from environment variable');
      credentials = JSON.parse(config.GOOGLE_CREDENTIALS_JSON);
    }
    // 指定されたパスから認証情報を取得
    else if (config.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('[INFO] Using Google credentials from path:', config.GOOGLE_APPLICATION_CREDENTIALS);
      const credentialsContent = await fsPromises.readFile(config.GOOGLE_APPLICATION_CREDENTIALS, 'utf8');
      credentials = JSON.parse(credentialsContent);
    }
    // 開発環境またはLambda環境で/tmpに一時的に保存されたファイルから読み込む
    else {
      const keyFilePath = process.env.NODE_ENV === 'production'
        ? path.join(config.TEMP_DIR, 'google-credentials.json')
        : './google-credentials.json';

      console.log('[INFO] Using Google credentials from file:', keyFilePath);
      const credentialsContent = await fsPromises.readFile(keyFilePath, 'utf8');
      credentials = JSON.parse(credentialsContent);
    }

    // 認証クライアントの作成
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      scopes
    );

    // アクセストークンを取得
    await auth.authorize();
    return auth;
  } catch (error) {
    console.error('[ERROR] Failed to authorize with Google:', error);
    throw error;
  }
}

/**
 * ファイルをGoogle Driveにアップロード
 * @param {string} filePath アップロードするファイルのパス
 * @param {string} fileName アップロード後のファイル名（接頭辞）
 * @param {string} folderId 保存先フォルダID
 * @param {string} extension ファイル拡張子
 * @returns {Promise<Object>} アップロードされたファイルのメタデータ
 */
async function uploadToGoogleDrive(filePath, fileName, folderId, extension) {
  try {
    const drive = await initializeGoogleDriveService();

    // ファイル名の作成
    const fullFileName = `${fileName}_${new Date().toISOString().replace(/:/g, '-')}_${config.FILE_SHORT_ID}.${extension}`;

    console.log(`[INFO] Uploading ${filePath} to Google Drive folder ${folderId}`);

    // ファイルのコンテンツタイプを判定
    const contentType = determineContentType(filePath);

    // ファイルのメタデータ
    const fileMetadata = {
      name: fullFileName,
      parents: [folderId]
    };

    // ファイルの内容を読み込む
    const media = {
      mimeType: contentType,
      body: fs.createReadStream(filePath)
    };

    // ファイルをアップロード
    const response = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id,name,webViewLink'
    });

    console.log(`[INFO] File uploaded successfully. ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    console.error('[ERROR] Failed to upload file to Google Drive:', error);
    throw error;
  }
}

/**
 * ファイルの拡張子からコンテンツタイプを判定
 * @param {string} filePath ファイルパス
 * @returns {string} MIMEタイプ
 */
function determineContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.html':
      return 'text/html';
    default:
      return 'application/octet-stream';
  }
}

module.exports = {
  uploadToGoogleDrive
};
