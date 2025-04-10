FROM node:22-slim

# タイムゾーンを設定
ENV TZ=Asia/Tokyo

# 非対話モードを設定
ENV DEBIAN_FRONTEND=noninteractive

# タイムゾーンの設定
RUN ln -sf /usr/share/zoneinfo/Asia/Tokyo /etc/localtime

# シンプルなaptインストール方法
RUN apt update && \
    apt install -y --no-install-recommends \
        chromium \
        chromium-driver \
        fonts-ipafont-gothic \
        fonts-wqy-zenhei \
        fonts-thai-tlwg \
        fonts-kacst \
        fonts-freefont-ttf \
        xvfb \
        xauth \
        wget \
        curl \
        gnupg \
        libxrender1 \
        libxtst6 \
        libnss3 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libgdk-pixbuf2.0-0 \
        libgtk-3-0 \
        libgbm-dev \
        libasound2 \
        locales \
        procps \
        vim \
    && rm -rf /var/lib/apt/lists/*

# 日本語ロケールのインストール
RUN localedef -f UTF-8 -i ja_JP ja_JP.UTF-8

# 環境変数の設定
ENV LANG='ja_JP.UTF-8' \
    LANGUAGE='ja_JP:ja' \
    LC_ALL='ja_JP.UTF-8'

# Chromeに関連する環境変数を設定
ENV CHROME_BIN=/usr/bin/chromium \
    CHROME_PATH=/usr/lib/chromium/ \
    PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROMIUM_PATH=/usr/bin/chromium

# 作業ディレクトリを設定
WORKDIR /app

# パッケージ設定ファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションのソースコードをコピー
COPY . .

# コンテナ起動時のコマンドを設定
CMD ["node", "index.js"]
