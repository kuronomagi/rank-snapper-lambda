// index.js - Lambda関数のエントリーポイント
const { snapperRankings } = require('./src/scraper');

/**
 * Lambda関数ハンドラー
 * @param {Object} event Lambda関数のイベントオブジェクト
 * @param {Object} context Lambda関数のコンテキストオブジェクト
 * @returns {Promise<Object>} 実行結果
 */
exports.handler = async (event, context) => {
  console.log('[INFO] Starting ranking snapper Lambda function');
  console.log('[INFO] Event:', JSON.stringify(event));

  try {
    // スクレイピングとスクリーンショットの実行
    const results = await snapperRankings();

    console.log('[INFO] Successfully completed ranking snapshots');
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully completed ranking snapshots',
        results
      })
    };
  } catch (error) {
    console.error('[ERROR] Failed to run ranking snapshots:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Failed to run ranking snapshots',
        error: error.message,
        stack: error.stack
      })
    };
  }
};

// Lambda環境でない場合（ローカル実行時）
if (require.main === module) {
  (async () => {
    try {
      const results = await snapperRankings();
      console.log('[INFO] Local execution results:', JSON.stringify(results, null, 2));
    } catch (error) {
      console.error('[ERROR] Local execution failed:', error);
    }
  })();
}
