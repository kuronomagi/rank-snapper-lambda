// index.js - Lambda 関数のエントリーポイント
const https = require('https');
const url = require('url');
const { snapperRankings } = require('./src/scraper');
const config = require('./src/config');

// 環境変数から Slack Webhook URL を取得
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

/**
 * Lambda関数ハンドラー
 * @param {Object} event Lambda関数のイベントオブジェクト
 * @param {Object} context Lambda関数のコンテキストオブジェクト
 * @returns {Promise<Object>} 実行結果
 */
exports.handler = async (event, context) => {
  console.log('[INFO] Starting ranking snapper Lambda function');
  console.log('[INFO] Received event:', JSON.stringify(event, null, 2));

  try {
    // event オブジェクトから rakutenUrl と amazonUrl を取得
    // event が空、またはキーが存在しない場合のデフォルト値を config から取得
    const rakutenUrl = event?.rakutenUrl;
    const amazonUrl = event?.amazonUrl;
    const keyword = event?.keyword || null; // 例: nyans
    const storeCode = event?.storeCode || null; // 例: chelseas-choice
    // const takeScreenshot = event?.takeScreenshot ?? true;

    if (!rakutenUrl && !amazonUrl) {
      console.warn('[WARN] No target URLs provided. Exiting.');
      return { statusCode: 200, body: JSON.stringify({ message: 'No target URLs provided.', results: {} }) };
    }


    console.log(`[INFO] Processing Rakuten URL: ${rakutenUrl || 'Not provided'}`);
    console.log(`[INFO] Processing Amazon URL: ${amazonUrl || 'Not provided'}`);
    console.log(`[INFO] Keyword for condition check: ${keyword || 'Not provided'}`); // キーワードログ追加
    console.log(`[INFO] Store Code for condition check: ${storeCode || 'Not provided'}`); // ★ ストアコードログ追加

    // ★ snapperRankings に keyword を渡す (takeScreenshotは削除)
    const results = await snapperRankings(rakutenUrl, amazonUrl, keyword, storeCode);

    console.log('[INFO] Successfully completed ranking processing.');
    const completionMessage = `Successfully completed ranking processing.`; // シンプルなメッセージ

    if (slackWebhookUrl) {
      // 必要なら結果の詳細をSlackに含める
      let slackText = completionMessage;
      if (results.rakuten?.condition_met) slackText += `\nRakuten condition met (keyword: ${keyword}, store: ${storeCode}). Screenshot taken.`;
      // Amazonの条件チェックは現状 storeCode に依存するため、基本満たされない
      // if (results.amazon?.condition_met) slackText += `\nAmazon condition met (keyword: ${keyword}). Screenshot taken.`;
      const slackMessage = { text: slackText }; // 少し詳細なメッセージ
      await postToSlack(slackMessage);
      console.log('Successfully sent completion notification to Slack');
    }

    // 成功レスポンス
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: completionMessage,
        results
      })
    };
  } catch (error) {
    console.error('[ERROR] Failed to run ranking snapshots:', error);

    // --- Slack通知処理 ---
    if (slackWebhookUrl) {
      // Slackに送信するメッセージを作成
      // context.functionName で実行中の関数名を取得
      // error.stack があればスタックトレースを含める、なければエラーメッセージのみ
      const errorMessage = `Lambda Function Error in ${context.functionName}:\n\`\`\`\n${error.stack || error.message}\n\`\`\``;
      // Slack の message payload 形式 (ここではシンプルな text のみ)
      const slackMessage = { text: errorMessage };

      try {
        // TODO: 「CloudWatch Alarms + SNS + AWS Chatbot」の構成で Lambda のエラー通知を実装したい
        // Slackに非同期でPOST
        await postToSlack(slackMessage);
        console.log('Successfully sent error notification to Slack');
      } catch (slackError) {
        // Slack通知自体が失敗した場合のエラーログ
        console.error('Failed to send notification to Slack:', slackError);
        // ここでさらにエラー処理を追加することも可能 (例: CloudWatchに記録するなど)
      }
    } else {
      console.warn('SLACK_WEBHOOK_URL environment variable not set. Skipping Slack notification.');
    }
    // --- Slack通知処理ここまで ---

    // エラーレスポンス (Lambda呼び出し元への返り値)
    // Lambda関数としてはエラーハンドリングしたので正常終了(200 OK)とするか、
    // 内部エラーがあったことを示す 500 Internal Server Error とするかの判断。
    // API Gateway経由などでなければ、呼び出し元がどう扱うか次第。ここでは500を返す。
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to run ranking snapshots',
        error: error.message,
        stack: error.stack // エラー詳細を含めるかは要検討 (セキュリティ)
      })
    };
  }
};

/**
 * Slack Incoming Webhook にメッセージをPOSTするヘルパー関数
 * @param {Object} message Slackに送信するメッセージオブジェクト (例: { text: "..." })
 * @returns {Promise<string>} Slack APIからのレスポンスボディ
 */
function postToSlack(message) {
  return new Promise((resolve, reject) => {
    if (!slackWebhookUrl) {
      console.warn('Slack Webhook URL not configured. Skipping notification.');
      // エラーにはせず、成功として扱う (または特定のエラーを返す)
      return resolve('Slack Webhook URL not configured.');
    }

    try {
      const options = url.parse(slackWebhookUrl);
      options.method = 'POST';
      options.headers = {
        'Content-Type': 'application/json',
      };

      const req = https.request(options, (res) => {
        let responseBody = '';
        res.on('data', (chunk) => { responseBody += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseBody); // Slack APIからの応答を返す (通常は 'ok')
          } else {
            reject(new Error(`Slack API Error: ${res.statusCode} - ${responseBody}`));
          }
        });
      });

      req.on('error', (error) => {
        // ネットワークエラーなど
        reject(new Error(`Failed to send request to Slack: ${error.message}`));
      });

      // メッセージオブジェクトをJSON文字列にして送信
      req.write(JSON.stringify(message));
      req.end();

    } catch (error) {
      // url.parse など、リクエスト前のエラー
      reject(new Error(`Error preparing Slack request: ${error.message}`));
    }
  });
}

// ローカル実行時の処理 (storeCode引数を追加)
if (require.main === module) {
  (async () => {
    try {
      const localRakutenUrl = process.argv[2];
      const localAmazonUrl = process.argv[3];
      const localKeyword = process.argv[4] || null;
      // ★ コマンドライン引数5番目をstoreCodeとする
      const localStoreCode = process.argv[5] || null;

      if (!localRakutenUrl && !localAmazonUrl) {
          console.error('[ERROR] Please provide Rakuten URL and/or Amazon URL.');
          process.exit(1);
      }

      console.log(`[INFO] Local execution with Rakuten URL: ${localRakutenUrl || 'Not provided'}, Amazon URL: ${localAmazonUrl || 'Not provided'}, Keyword: ${localKeyword || 'Not provided'}, Store Code: ${localStoreCode || 'Not provided'}`);
      // ★ keyword と storeCode を渡す
      const results = await snapperRankings(localRakutenUrl, localAmazonUrl, localKeyword, localStoreCode);
      console.log('[INFO] Local execution results:', JSON.stringify(results, null, 2));
    } catch (error) {
      console.error('[ERROR] Local execution failed:', error);
      // ... (Slack通知は変更なし) ...
      process.exit(1);
    }
  })();
}
