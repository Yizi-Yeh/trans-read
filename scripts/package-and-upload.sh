#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_ARCHIVE_PATH="${CONFIG_ARCHIVE_PATH:-$PROJECT_ROOT/deploy-config.tar.gz}"
IMAGE_ARCHIVE_PATH="${IMAGE_ARCHIVE_PATH:-$PROJECT_ROOT/app-image.tar.gz}"
APP_IMAGE_NAME="${APP_IMAGE_NAME:-jp-n1:deploy}"
NODE_IMAGE="${NODE_IMAGE:-}"
TARGET_PLATFORM="${TARGET_PLATFORM:-linux/amd64}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_HOST="${REMOTE_HOST:?Set REMOTE_HOST to your VPS IP or hostname.}"
REMOTE_CONFIG_PATH="${REMOTE_CONFIG_PATH:-/root/deploy-config.tar.gz}"
REMOTE_IMAGE_PATH="${REMOTE_IMAGE_PATH:-/root/app-image.tar.gz}"
STAGING_DIR="$(mktemp -d)"
TAR_ARGS=(-czf "$CONFIG_ARCHIVE_PATH")

cleanup() {
  rm -rf "$STAGING_DIR"
}

trap cleanup EXIT

echo "Packaging project from: $PROJECT_ROOT"

echo "Building production image locally: $APP_IMAGE_NAME ($TARGET_PLATFORM)"
cd "$PROJECT_ROOT"
DOCKER_BUILD_ARGS=(-t "$APP_IMAGE_NAME")
if [[ -n "$NODE_IMAGE" ]]; then
  DOCKER_BUILD_ARGS+=(--build-arg "NODE_IMAGE=$NODE_IMAGE")
fi
if docker buildx version >/dev/null 2>&1; then
  docker buildx build --platform "$TARGET_PLATFORM" --load "${DOCKER_BUILD_ARGS[@]}" .
else
  docker build --platform "$TARGET_PLATFORM" "${DOCKER_BUILD_ARGS[@]}" .
fi

echo "Saving production image archive"
docker save "$APP_IMAGE_NAME" | gzip > "$IMAGE_ARCHIVE_PATH"

mkdir -p "$STAGING_DIR"

cp -R "$PROJECT_ROOT/prisma" "$STAGING_DIR/prisma"
cp "$PROJECT_ROOT/docker-compose.yml" "$STAGING_DIR/docker-compose.yml"
cp "$PROJECT_ROOT/.env.production.example" "$STAGING_DIR/.env.production.example"

if tar --help 2>/dev/null | grep -q -- "--no-mac-metadata"; then
  TAR_ARGS+=(--no-mac-metadata)
fi

if tar --help 2>/dev/null | grep -q -- "--disable-copyfile"; then
  TAR_ARGS+=(--disable-copyfile)
fi

COPYFILE_DISABLE=1 tar \
  "${TAR_ARGS[@]}" \
  -C "$STAGING_DIR" .

echo "Uploading config archive to $REMOTE_USER@$REMOTE_HOST:$REMOTE_CONFIG_PATH"
scp "$CONFIG_ARCHIVE_PATH" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_CONFIG_PATH"

echo "Uploading image archive to $REMOTE_USER@$REMOTE_HOST:$REMOTE_IMAGE_PATH"
scp "$IMAGE_ARCHIVE_PATH" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_IMAGE_PATH"

echo "Done."
