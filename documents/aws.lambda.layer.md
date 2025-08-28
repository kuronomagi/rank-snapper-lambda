


# Lambda関数に指定するレイヤー


## 1. chromiumレイヤー
ビルドファイルに含めるとサイズオーバーするため、レイヤーを作成しアップロードします。

```
git clone --depth=1 https://github.com/sparticuz/chromium.git && \
  cd chromium && \
  make chromium.zip && \
  bucketName="lambda-ja-fonts-layer-bucket" && \
  versionNumber="133" && \
  aws --profile your-lambda-deployment-user s3 cp chromium.zip "s3://${bucketName}/chromiumLayers/chromium${versionNumber}.zip" && \
  aws lambda publish-layer-version \
    --layer-name chromium \
    --description "Chromium v${versionNumber}" \
    --content "S3Bucket=${bucketName},S3Key=chromiumLayers/chromium${versionNumber}.zip" \
    --compatible-runtimes nodejs \
    --compatible-architectures x86_64 \
    --profile your-lambda-deployment-user
```

Response
```
{
    "Content": {
        "Location": "https://awslambda-ap-ne-1-layers.s3.ap-northeast-1.amazonaws.com/snapshots/061051243877/chromium-592688e5-fe62-44ab-b1de-13f468d44a7d?versionId=.rg9E3M71pE8yM3usMPho_4nQDr3SK_C&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECcaDmFwLW5vcnRoZWFzdC0xIkgwRgIhANjhYofxAW5hB9BOkzZGMDdeuJ5toYq6ROeTLsW158O3AiEA6%2Bz3qyIU7LakRkW09ajcTU%2Fa74eAGPVmmmivv8zrsM4qyQUIoP%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAEGgw5MTk5ODA5MjUxMzkiDN5aSIxt2E%2FqfrGYhSqdBecty%2BWybl9zNTGAbidCUyajPjDB%2F3DwphYaYKScLNKdtTi4x42enrRaxuVR6BOs79miaPifP6E%2FbQiX0fhhaoGcCCEHh8SBmRJMUI9yeRZjnZ9wG8R5apcM34EksrlAvc9uD2k1fsRMOWBiKl3tB6LVxZQZT4uAl%2Bk9vJz%2FhgibjBNW5641RrjzFteuQvga0pMSfJATebYjIGe5K%2F2LtGaDXLRggMNqbvvXKT4fby4f%2BpI9grQaerFPmhhnIB6yvfUNMkoemn8%2B4oEHwiYU37%2FqeGMyTYt8aXkmKJj72iE1NJFavbD7GUDFQlmF77x28tpAqO5AjLIcZqfugzISHlgGrrkCDcDJfiK3xnTFbGlovY80RLmh38GmCpd89fUb8q%2B9o9xY9SayqAoIT5CQFMtcXI3XreAfyqBryb%2B6R7%2FnIY1oryFTEJnd0vtr4yACcn5phtMVgHTIVDCWhrhuSMc4Dci7S8vT1nEtqZTk%2BgT%2FQoCT8oVWm8esmfEflukHm1F4e4VxKV3PrSjKxQC3c5h2anhtqLfXLP9sWIyIxTbPOhEKWlgznvWNzMfzOd0FmY8UnUYkI0PJwKpDmy2UW0NK7aQdA7Q7%2Fg72K5JHlktoevKB6FfcRWW9A3YXpX5ue%2Fjbi%2FVYDZYR7l%2Bq6kgAU9DwimFSNXgWQVrLM%2Frbw9ZJwrcJoFXx9Y2VYjCMJ5MXBtBkDdBrCR0ib4%2FCC3ibtkzA1ZeubSwkmTpAA%2B7JUdh%2BD6Z8PTGjwmVpz8ikCouwejXhxn94oWiyH1uMK0g64OSNXQkot3cbP0%2FKAWvDcWrU67jB5vnd53XID6MvuN4xEzqu6D4oku5qja4emfpcQ%2BER2tiLsO0GwL3JgXag1vC3zzpu7Tcgopir6YbO9TCT3N2%2FBjqwAYD%2FWGZ1fITcuwe44pchfS16Ffnt7y6HDSYCfHDWHeUqDVqZVk8%2B2siQ44XxhTiv5FRO%2BFvE3SLpu1bGcbxZgYMw6E2fFjL%2F3JsBjI%2B%2BGeRo4lm6uClAjUPtZLvEtUaz7Zzx0nUKjDEqFZdOpnbJ79RowG19qyLD9gLWYNtgcC6s%2BnGnvz6tqsUbSSWwIKcSVcymnvpYFGLS8U2aHxcip%2BFE%2Bao1OCm2CsiUIvyxTTcx&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20250410T082336Z&X-Amz-SignedHeaders=host&X-Amz-Expires=600&X-Amz-Credential=ASIA5MMZC4DJSD4O2XNB%2F20250410%2Fap-northeast-1%2Fs3%2Faws4_request&X-Amz-Signature=efc888f3da4f81c1731f575077981e4e54f634ca0e9f3456cd1a41df99451d8b",
        "CodeSha256": "DLtt+7YqPc4BmNYQ2vB+uESE//NJOYR/xghC76Dn9zA=",
        "CodeSize": 66065665
    },
    "LayerArn": "arn:aws:lambda:ap-northeast-1:061051243877:layer:chromium",
    "LayerVersionArn": "arn:aws:lambda:ap-northeast-1:061051243877:layer:chromium:1",
    "Description": "Chromium v133",
    "CreatedDate": "2025-04-10T08:23:42.641+0000",
    "Version": 1,
    "CompatibleRuntimes": [
        "nodejs"
    ],
    "CompatibleArchitectures": [
        "x86_64"
    ]
}
```

### ちなみに以下はARNが公開されていないため使用できません。
https://github.com/shelfio/chrome-aws-lambda-layer

```
ap-northeast-1: arn:aws:lambda:ap-northeast-1:764866452798:layer:chrome-aws-lambda:50
ap-northeast-2: arn:aws:lambda:ap-northeast-2:764866452798:layer:chrome-aws-lambda:49
ap-south-1: arn:aws:lambda:ap-south-1:764866452798:layer:chrome-aws-lambda:50
ap-southeast-1: arn:aws:lambda:ap-southeast-1:764866452798:layer:chrome-aws-lambda:50
ap-southeast-2: arn:aws:lambda:ap-southeast-2:764866452798:layer:chrome-aws-lambda:50
ca-central-1: arn:aws:lambda:ca-central-1:764866452798:layer:chrome-aws-lambda:50
eu-north-1: arn:aws:lambda:eu-north-1:764866452798:layer:chrome-aws-lambda:50
eu-central-1: arn:aws:lambda:eu-central-1:764866452798:layer:chrome-aws-lambda:50
eu-west-1: arn:aws:lambda:eu-west-1:764866452798:layer:chrome-aws-lambda:50
eu-west-2: arn:aws:lambda:eu-west-2:764866452798:layer:chrome-aws-lambda:50
eu-west-3: arn:aws:lambda:eu-west-3:764866452798:layer:chrome-aws-lambda:50
sa-east-1: arn:aws:lambda:sa-east-1:764866452798:layer:chrome-aws-lambda:50
us-east-1: arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:50
us-east-2: arn:aws:lambda:us-east-2:764866452798:layer:chrome-aws-lambda:50
us-west-1: arn:aws:lambda:us-west-1:764866452798:layer:chrome-aws-lambda:50
us-west-2: arn:aws:lambda:us-west-2:764866452798:layer:chrome-aws-lambda:50
```

## 2. Lambda用日本語フォントレイヤーの作成手順

日本語フォントをLambdaに追加するためには、カスタムレイヤーを作成する必要があります。

### 1. フォントレイヤー用のディレクトリを作成

```bash
mkdir -p lambda-layers/fonts/fonts
cd lambda-layers/fonts
```

### 2. 日本語フォントをダウンロード

https://github.com/ixkaito/NotoSansJP-subset
https://github.com/ixkaito/NotoSansJP-subset/tree/master/subset

`subset` の中のフォントファイルをすべて

### 3. レイヤーを作成

```bash
# レイヤー用のディレクトリ構造を作成
mkdir -p lambda-layer/fonts/lib/fonts

フォントを全て入れる

# ZIPアーカイブを作成
cd lambda-layer
zip -r ../japanese-fonts-layer.zip .
cd ..
```

### 4. AWS CLIを使ってレイヤーを公開

#### Zip ファイルを S3 にアップロード:

`lambda-ja-fonts-layer-bucket` バケットを作成

```
aws s3 cp japanese-fonts-layer.zip s3://lambda-ja-fonts-layer-bucket/japanese-fonts-layer.zip --profile your-lambda-deployment-user
```

#### S3 パスを指定して Lambda レイヤーを公開:

aws lambda publish-layer-version コマンドを実行します。今度は --zip-file オプションの代わりに --content オプションを使用し、S3 バケット名 (S3Bucket) と S3 上のファイル名 (S3Key) を指定します。

`lambda-ja-fonts-layer-bucket`

```
aws lambda publish-layer-version \
  --layer-name japanese-fonts \
  --description "Japanese fonts for Lambda (Noto Sans JP from S3)" \
  --content S3Bucket=lambda-ja-fonts-layer-bucket,S3Key=japanese-fonts-layer.zip \
  --compatible-runtimes nodejs22.x \
  --profile your-lambda-deployment-user
```

#### 結果

```
{
    "Content": {
        "Location": "https://awslambda-ap-ne-1-layers.s3.ap-northeast-1.amazonaws.com/snapshots/061051243877/japanese-fonts-3e658c03-ba8a-4514-86a0-fe66d4207d84?versionId=9Q_C57EC8KvXn7pUBdPHWFjkAlqtfrEK&X-Amz-Security-Token=IQoJb3JpZ2luX2VjECgaDmFwLW5vcnRoZWFzdC0xIkcwRQIhAKirYam9i8WPJDskYY6SCa33yLZcP78QZEvsTzR%2BBZT9AiB2BDpNtQdzq5aPcTZqt1NABMRj30oIbM8PRnjpf4%2BlSSrJBQih%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F8BEAQaDDkxOTk4MDkyNTEzOSIM1AiSSuIQupkZW3NzKp0Fd8tV9IH9O3nvDBV5izEHLdc1PzdYJL9K8fJmtFtNKxVRu3y5gGPW7gVIhnDKtJu8rvfYGtxMhiYS8Zq%2F17UX50zm3jzKJWLAGXnfroPj5eBG8kaoIt3JcuwLQzD90z3EbyD6Gowxr6l8fMc%2BPQnvpe1kQA5QrMDWCGdb7tetasBfPu00Uk2fjig1PIVvJXMFOHXuHahMgdwAcagzzvuubtlSyfiD%2FMHtZdaQHnLMZhbibfAdnyywErnz4H9PFRSGB8Tu6Hek61Won2wjbO9gKtlKVIW6PEu5KOwITdkAno31VrIwJUZ5q%2BPGtiLI%2F6YHejhLnXuqaE9vu2qgSjcGaUCqXPj6eDXQ2QjO2JmEWdmsJ%2FKkQmHOei0qbbktNtrWm49CN0tMrmC8MBRZlOHRcG6v9PLPGIM8wHn8LRjBpgzY4MkLVhWxj%2B4mpPF6GjXbEdjsVG7xnFs4Gn8flY4k9gAgzcP5s%2Fvx64nKJGBaYw7xYI3nS33YAngrAqNoBQXTUGQLVjmai7k930iwcs9Enik39XxTNTh%2FqN3mAVQ%2F3v3jJBWREfgftyPObwyZy7XD00sLJeQKhG2f4edP94snV3XOxwnAiz8qVbsoNcTYIQFQKU2exSxhxeV6azCDwcpMu%2BY7C14%2Busv1jRTkJpzRg6vnO2s2v1UJ8tNuWTbInDe6uR1eEC7NjScjHJD801eOyALmCT4Ppk1BZ2bCQpqMCxPrn3bjvhS8u7DKV19SPG3copivWPaAnoi5pJGKfN4C5umXPLmoGOhDWPxjfDXZwNRKJBi0rI%2FroPuNVvVJhRJPWESc2jKp9NOmOqzX5RE4xcGwlMs70YtJmFlrcfkRpyvKLmN12GYqvJkFHlRv3Van3nvLKkOQ31A52KBtMNT73b8GOrEBIR%2BRWhs80xQNNUSyTcz%2B0yyXOtyDnwzKy7%2FpyXT4zSEUPEjjZ4zudT7NhwvIx1oGr40urgM59X4Zf2vBHTUxrTRC4af%2FLIwTiLygrsMt3O5LnGDVdr0c%2Bwt%2BaWbGtkt2MimooF0Au1PCdEb0vX1RvuxLKh%2FYCK6IvrpVqzZkYDlQJ3nmez1hCwqvGYSKvNT93fQ2fgiZ7EXjjT5x7Bspyj0LIbuVIWX%2FnmRya0%2F0jigJ&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20250410T090219Z&X-Amz-SignedHeaders=host&X-Amz-Expires=600&X-Amz-Credential=ASIA5MMZC4DJ3CKGXXCS%2F20250410%2Fap-northeast-1%2Fs3%2Faws4_request&X-Amz-Signature=3384a93cb73e74e6fa6d056d5a6f6807d5e0c8cf647302c3186180211d132c6f",
        "CodeSha256": "STEYasTGwh0bXG4CdYCfFHyWbJKeMuqCy48SbtVh1EE=",
        "CodeSize": 9146293
    },
    "LayerArn": "arn:aws:lambda:ap-northeast-1:061051243877:layer:japanese-fonts",
    "LayerVersionArn": "arn:aws:lambda:ap-northeast-1:061051243877:layer:japanese-fonts:3",
    "Description": "Japanese fonts for Lambda (Noto Sans JP from S3)",
    "CreatedDate": "2025-04-10T09:02:23.012+0000",
    "Version": 3,
    "CompatibleRuntimes": [
        "nodejs22.x"
    ]
}
```

以下はzipサイズが大きくてアップできない
```bash
aws lambda publish-layer-version \
  --layer-name japanese-fonts \
  --description "Japanese fonts for Lambda" \
  --zip-file fileb://japanese-fonts-layer.zip \
  --compatible-runtimes nodejs22.x \
  --profile your-lambda-deployment-user
```

### 5. serverless.ymlファイルにレイヤーを追加

```yaml
functions:
  snapperRankings:
    handler: index.handler
    layers:
      # 日本語フォントレイヤー - 実際のARNに置き換えてください
      - arn:aws:lambda:ap-northeast-1:ACCOUNT_ID:layer:japanese-fonts:1
```

### 6. ブラウザコードでフォントの設定を追加

`src/browser.js`ファイルの`initializeBrowser`関数内で、ブラウザオプションにフォントの設定を追加します：

```javascript
// Lambda環境での設定
browserOptions = {
  args: chromium.args.concat([
    '--no-sandbox',
    '--font-render-hinting=none', // フォントヒンティングを無効化
    `--window-size=${config.WINDOW_SIZE.width},${config.WINDOW_SIZE.height}`
  ]),
  // 他の設定...
};
```
