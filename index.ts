// index.ts - Lambda 関数のエントリーポイント
import * as https from "https";
import * as url from "url";
import { snapperRankings } from "./src/scraper";
// import config from './src/config';
import type { LambdaEvent, LambdaContext, LambdaResponse } from "./src/types";

// 環境変数から Slack Webhook URL を取得
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

/**
 * Lambda関数ハンドラー
 * @param event Lambda関数のイベントオブジェクト
 * @param context Lambda関数のコンテキストオブジェクト
 * @returns 実行結果
 */
export const handler = async (
  event: LambdaEvent,
  context: LambdaContext
): Promise<LambdaResponse> => {
  console.log("[INFO] Starting ranking snapper Lambda function");
  console.log("[INFO] Received event:", JSON.stringify(event, null, 2));

  try {
    // event オブジェクトから rakutenUrl と amazonUrl を取得
    const rakutenUrl = event?.rakutenUrl;
    const amazonUrl = event?.amazonUrl;
    const keyword = event?.keyword || null;
    const storeCode = event?.storeCode || null;

    if (!rakutenUrl && !amazonUrl) {
      console.warn("[WARN] No target URLs provided. Exiting.");
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "No target URLs provided.",
          results: {},
        }),
      };
    }

    console.log(
      `[INFO] Processing Rakuten URL: ${rakutenUrl || "Not provided"}`
    );
    console.log(`[INFO] Processing Amazon URL: ${amazonUrl || "Not provided"}`);
    console.log(
      `[INFO] Keyword for condition check: ${keyword || "Not provided"}`
    );
    console.log(
      `[INFO] Store Code for condition check: ${storeCode || "Not provided"}`
    );

    const results = await snapperRankings(
      rakutenUrl,
      amazonUrl,
      keyword,
      storeCode
    );

    console.log("[INFO] Successfully completed ranking processing.");
    const completionMessage = `Successfully completed ranking processing.`;

    if (slackWebhookUrl) {
      // 必要なら結果の詳細をSlackに含める
      let slackText = completionMessage;
      if (results.rakuten?.condition_met) {
        slackText += `\nRakuten condition met (keyword: ${keyword}, store: ${storeCode}). Screenshot taken.`;
      }
      const slackMessage = { text: slackText };
      await postToSlack(slackMessage);
      console.log("Successfully sent completion notification to Slack");
    }

    // 成功レスポンス
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: completionMessage,
        results,
      }),
    };
  } catch (error: any) {
    console.error("[ERROR] Failed to run ranking snapshots:", error);

    // --- Slack通知処理 ---
    if (slackWebhookUrl) {
      const errorMessage = `Lambda Function Error in ${
        context.functionName
      }:\n\`\`\`\n${error.stack || error.message}\n\`\`\``;
      const slackMessage = { text: errorMessage };

      try {
        await postToSlack(slackMessage);
        console.log("Successfully sent error notification to Slack");
      } catch (slackError) {
        console.error("Failed to send notification to Slack:", slackError);
      }
    } else {
      console.warn(
        "SLACK_WEBHOOK_URL environment variable not set. Skipping Slack notification."
      );
    }

    // エラーレスポンス
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to run ranking snapshots",
        error: error.message,
        stack: error.stack,
      }),
    };
  }
};

/**
 * Slack Incoming Webhook にメッセージをPOSTするヘルパー関数
 * @param message Slackに送信するメッセージオブジェクト
 * @returns Slack APIからのレスポンスボディ
 */
function postToSlack(message: { text: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!slackWebhookUrl) {
      console.warn("Slack Webhook URL not configured. Skipping notification.");
      return resolve("Slack Webhook URL not configured.");
    }

    try {
      const options = url.parse(slackWebhookUrl) as https.RequestOptions;
      options.method = "POST";
      options.headers = {
        "Content-Type": "application/json",
      };

      const req = https.request(options, (res) => {
        let responseBody = "";
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseBody);
          } else {
            reject(
              new Error(`Slack API Error: ${res.statusCode} - ${responseBody}`)
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`Failed to send request to Slack: ${error.message}`));
      });

      req.write(JSON.stringify(message));
      req.end();
    } catch (error: any) {
      reject(new Error(`Error preparing Slack request: ${error.message}`));
    }
  });
}

// ローカル実行時の処理
if (require.main === module) {
  (async () => {
    try {
      const localRakutenUrl = process.argv[2];
      const localAmazonUrl = process.argv[3];
      const localKeyword = process.argv[4] || null;
      const localStoreCode = process.argv[5] || null;

      if (!localRakutenUrl && !localAmazonUrl) {
        console.error("[ERROR] Please provide Rakuten URL and/or Amazon URL.");
        process.exit(1);
      }

      console.log(
        `[INFO] Local execution with Rakuten URL: ${
          localRakutenUrl || "Not provided"
        }, Amazon URL: ${localAmazonUrl || "Not provided"}, Keyword: ${
          localKeyword || "Not provided"
        }, Store Code: ${localStoreCode || "Not provided"}`
      );
      const results = await snapperRankings(
        localRakutenUrl,
        localAmazonUrl,
        localKeyword,
        localStoreCode
      );
      console.log(
        "[INFO] Local execution results:",
        JSON.stringify(results, null, 2)
      );
    } catch (error) {
      console.error("[ERROR] Local execution failed:", error);
      process.exit(1);
    }
  })();
}
