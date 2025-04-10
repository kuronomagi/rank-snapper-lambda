.PHONY: build run stop clean logs deploy shell

# DockerのBuildkitを有効化
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

# Dockerコンテナをビルド
build:
	docker-compose build

# Dockerで実行
run:
	docker-compose up

# バックグラウンドでDockerを実行
run-bg:
	docker-compose up -d

# Dockerコンテナを停止
stop:
	docker-compose down

# Dockerのログを表示
logs:
	docker-compose logs -f

# キャッシュなしでビルド
rebuild:
	docker-compose build --no-cache

# 全てのDockerリソースをクリーンアップ
clean:
	docker-compose down -v --remove-orphans

# コンテナ内でシェルを起動（デバッグ用）
shell:
	docker-compose exec app bash

# AWS Lambdaにデプロイ
deploy:
	npm run deploy:prod

# プロダクションモードで実行（デバッグなし）
prod:
	NODE_ENV=production docker-compose up

# ローカルの開発環境で実行（Puppeteer使用）
dev:
	npm run local

# デフォルトのアクション
default: build run
