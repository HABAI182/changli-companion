#!/bin/bash
set -euo pipefail
source_root="$(cd "$(dirname "$0")/.." && pwd -P)"
if [[ "$(uname -s)" != Darwin ]]; then
  echo "This command requires macOS and Xcode Command Line Tools." >&2
  exit 1
fi
if [[ "$(uname -m)" != arm64 ]]; then
  echo "This macOS build supports Apple Silicon only." >&2
  exit 1
fi
mode="${1:-build}"
shift || true
if [[ "$mode" != build && "$mode" != test ]]; then
  echo "Supported commands: build, test" >&2
  exit 1
fi
# Keep dependencies, generated files and bundles in a sibling folder.
build_root="$(dirname "$source_root")/$(basename "$source_root")-build"
mkdir -p "$build_root"
build_root="$(cd "$build_root" && pwd -P)"
case "$build_root/" in
  "$source_root/"*) echo "Build folder must be outside the source folder." >&2; exit 1 ;;
esac
case "$source_root/" in
  "$build_root/"*) echo "Build folder must not contain the source folder." >&2; exit 1 ;;
esac
lock="$build_root/.build-lock"
if ! mkdir "$lock" 2>/dev/null; then
  echo "Another macOS command is running (lock: $lock)." >&2
  exit 1
fi
trap 'rmdir "$lock"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
workspace="$build_root/workspace"
mkdir -p "$workspace"
# --delete only synchronizes the disposable build copy. Excluded generated
# directories are preserved so subsequent builds can reuse their caches.
rsync -a --delete \
  --exclude='/.git/' --exclude='/node_modules/' --exclude='/dist/' \
  --exclude='/src-tauri/target/' --exclude='/.macos-cache/' \
  --exclude='/deliveries/' --exclude='/src-tauri/gen/schemas/macOS-schema.json' \
  --exclude='.DS_Store' --exclude='.env' --exclude='.env.*' \
  --exclude='*.log' --exclude='*.sqlite3' --exclude='*.sqlite3-*' \
  "$source_root/" "$workspace/"
cd "$workspace"
export CARGO_TARGET_DIR="$workspace/src-tauri/target"
export npm_config_cache="$build_root/cache/npm"
# npm ci honors the lockfile on every invocation; its cache stays outside source.
npm ci --no-audit --no-fund
if [[ "$mode" == test ]]; then
  npm run typecheck
  npm test
  npm run tauri -- build --config macos/tauri.conf.json --features tauri/macos-private-api --target aarch64-apple-darwin --no-bundle --ci
  TAURI_CONFIG="$(cat macos/tauri.conf.json)" cargo test --target aarch64-apple-darwin --manifest-path src-tauri/Cargo.toml --release --locked --features tauri/macos-private-api,tauri/custom-protocol "$@"
else
  if ! npm run tauri -- build --config macos/tauri.conf.json --features tauri/macos-private-api --target aarch64-apple-darwin --ci "$@" 2>&1 | tee "$build_root/build.log"; then
    # Synced Documents folders may attach Finder metadata to a new app bundle.
    # Only retry this specific signing failure, after cleaning generated apps.
    if [[ "$(cat "$build_root/build.log")" != *"resource fork, Finder information"* ]]; then
      exit 1
    fi
    for app_bundle in "$CARGO_TARGET_DIR/aarch64-apple-darwin/release/bundle/macos/"*.app; do
      if [[ -d "$app_bundle" ]]; then
        xattr -cr "$app_bundle"
      fi
    done
    npm run tauri -- build --config macos/tauri.conf.json --features tauri/macos-private-api --target aarch64-apple-darwin --ci "$@"
  fi
  echo "macOS bundles: $CARGO_TARGET_DIR/aarch64-apple-darwin/release/bundle/"
fi
