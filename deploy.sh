#!/bin/sh
set -eu

APP_NAME="${APP_NAME:-data-analysis-workbench}"
IMAGE_NAME="${IMAGE_NAME:-data-analysis-workbench}"
IMAGE_TAG="${IMAGE_TAG:-offline}"
IMAGE_REF="${IMAGE_NAME}:${IMAGE_TAG}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BUNDLE_DIR="${BUNDLE_DIR:-dist}"
BUNDLE_NAME="${BUNDLE_NAME:-${APP_NAME}-offline-$(date +%Y%m%d%H%M%S).tar.gz}"
PACK_DIR=".deploy-pack"

usage() {
  echo "Usage: $0 {pack|start|stop}"
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing command: $1" >&2
    exit 1
  fi
}

docker_cmd() {
  if command -v docker >/dev/null 2>&1 && docker version >/dev/null 2>&1; then
    docker "$@"
  elif command -v docker.exe >/dev/null 2>&1 && docker.exe version >/dev/null 2>&1; then
    docker.exe "$@"
  else
    echo "Missing docker command." >&2
    exit 1
  fi
}

compose() {
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose -f "$COMPOSE_FILE" "$@"
  elif command -v docker-compose.exe >/dev/null 2>&1; then
    docker-compose.exe -f "$COMPOSE_FILE" "$@"
  elif docker compose version >/dev/null 2>&1; then
    docker compose -f "$COMPOSE_FILE" "$@"
  elif docker_cmd compose version >/dev/null 2>&1; then
    docker_cmd compose -f "$COMPOSE_FILE" "$@"
  else
    echo "Missing docker-compose command." >&2
    exit 1
  fi
}

pack() {
  need_cmd tar

  mkdir -p "$BUNDLE_DIR"
  rm -rf "$PACK_DIR"
  mkdir -p "$PACK_DIR/image"

  echo "Building Docker image: $IMAGE_REF"
  docker_cmd build -t "$IMAGE_REF" .

  echo "Saving Docker image..."
  docker_cmd save -o "$PACK_DIR/image/${APP_NAME}.tar" "$IMAGE_REF"

  cp "$COMPOSE_FILE" "$PACK_DIR/"
  cp "$0" "$PACK_DIR/deploy.sh"
  chmod +x "$PACK_DIR/deploy.sh"
  printf "IMAGE_REF=%s\n" "$IMAGE_REF" > "$PACK_DIR/VERSION"

  echo "Creating bundle: $BUNDLE_DIR/$BUNDLE_NAME"
  tar -czf "$BUNDLE_DIR/$BUNDLE_NAME" -C "$PACK_DIR" .
  rm -rf "$PACK_DIR"

  echo "Done: $BUNDLE_DIR/$BUNDLE_NAME"
}

start() {
  if [ -d image ]; then
    for image_tar in image/*.tar; do
      if [ -f "$image_tar" ]; then
        echo "Loading Docker image: $image_tar"
        docker_cmd load -i "$image_tar"
      fi
    done
  fi

  compose up -d
}

stop() {
  compose down
}

case "${1:-}" in
  pack)
    pack
    ;;
  start)
    start
    ;;
  stop)
    stop
    ;;
  *)
    usage
    exit 1
    ;;
esac
