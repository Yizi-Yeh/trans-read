#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-/root/jp-n1}"
CONFIG_ARCHIVE_PATH="${CONFIG_ARCHIVE_PATH:-/root/deploy-config.tar.gz}"
IMAGE_ARCHIVE_PATH="${IMAGE_ARCHIVE_PATH:-/root/app-image.tar.gz}"
SOURCE_ARCHIVE_PATH="${SOURCE_ARCHIVE_PATH:-/root/jp-n1-src.tar.gz}"
SOURCE_DIR="${SOURCE_DIR:-/root/jp-n1-src}"
ENV_FILE="${ENV_FILE:-$APP_DIR/.env.production}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-jp-n1}"
APP_IMAGE_NAME="${APP_IMAGE_NAME:-jp-n1:deploy}"
PRISMA_VERSION="${PRISMA_VERSION:-6.19.2}"
PRISMA_TOOLS_DIR="${PRISMA_TOOLS_DIR:-$APP_DIR/.prisma-tools}"
PRISMA_TOOLS_IMAGE="${PRISMA_TOOLS_IMAGE:-node:20-bookworm-slim}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is not installed on this server."
  exit 1
fi

if [[ ! -f "$CONFIG_ARCHIVE_PATH" ]]; then
  echo "Config archive not found: $CONFIG_ARCHIVE_PATH"
  exit 1
fi

if [[ ! -f "$IMAGE_ARCHIVE_PATH" ]]; then
  echo "Image archive not found: $IMAGE_ARCHIVE_PATH"
  exit 1
fi

mkdir -p "$APP_DIR"
rm -rf "$APP_DIR/prisma"
tar -xzf "$CONFIG_ARCHIVE_PATH" -C "$APP_DIR"
rm -f "$CONFIG_ARCHIVE_PATH"

cd "$APP_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  cp .env.production.example "$ENV_FILE"
  echo "Created $ENV_FILE from template."
  echo "Edit it before running this script again."
  exit 1
fi

echo "Loading runtime image: $APP_IMAGE_NAME"
gunzip -c "$IMAGE_ARCHIVE_PATH" | docker load
rm -f "$IMAGE_ARCHIVE_PATH"

APP_IMAGE_NAME="$APP_IMAGE_NAME" docker compose --env-file "$ENV_FILE" up -d --force-recreate

set -a
. "$ENV_FILE"
set +a

mkdir -p "$PRISMA_TOOLS_DIR"

docker run --rm \
  --network "${COMPOSE_PROJECT_NAME}_default" \
  -v "$PRISMA_TOOLS_DIR:/tools" \
  -v "$APP_DIR/prisma:/app/prisma" \
  -w /tools \
  -e DATABASE_URL="$DATABASE_URL" \
  -e PRISMA_VERSION="$PRISMA_VERSION" \
  "$PRISMA_TOOLS_IMAGE" \
  sh -lc '
    set -e
    if [ ! -f package.json ]; then
      npm init -y >/dev/null 2>&1
    fi

    INSTALLED_VERSION=""
    if [ -f node_modules/prisma/package.json ]; then
      INSTALLED_VERSION=$(node -p "require(\"./node_modules/prisma/package.json\").version")
    fi

    if [ "$INSTALLED_VERSION" != "$PRISMA_VERSION" ]; then
      npm install --silent "prisma@$PRISMA_VERSION"
    fi

    node node_modules/prisma/build/index.js db push --schema /app/prisma/schema.prisma --skip-generate
  '

rm -f "$SOURCE_ARCHIVE_PATH"
rm -rf "$SOURCE_DIR"

docker container prune -f >/dev/null 2>&1 || true
docker image prune -f >/dev/null 2>&1 || true
docker builder prune -af >/dev/null 2>&1 || true

echo "Deploy complete."
