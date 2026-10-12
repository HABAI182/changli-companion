#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Darwin ]]; then
  echo "This command requires macOS and Xcode Command Line Tools." >&2
  exit 1
fi
mkdir -p .macos-cache
lock="$PWD/.macos-cache/tauri-lock"
if ! mkdir "$lock" 2>/dev/null; then
  echo "Another macOS build/dev command is running (lock: $lock)." >&2
  exit 1
fi
# Tauri CLI automatically edits the manifest when enabling the transparent
# macOS window feature. Restore the exact caller's manifest on every exit.
cp src-tauri/Cargo.toml "$lock/Cargo.toml"
cleanup() {
  cp "$lock/Cargo.toml" src-tauri/Cargo.toml
  rm "$lock/Cargo.toml"
  rmdir "$lock"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
if [[ ! -d node_modules/@tauri-apps/cli ]]; then
  npm ci --cache "$PWD/.macos-cache/npm" --no-audit --no-fund
fi
mode="$1"
shift
if [[ "$mode" == test ]]; then
  npm run tauri -- build --config macos/tauri.conf.json --features tauri/macos-private-api --no-bundle
  TAURI_CONFIG="$(cat macos/tauri.conf.json)" cargo test --manifest-path src-tauri/Cargo.toml --release --locked --features tauri/macos-private-api,tauri/custom-protocol "$@"
  exit 0
fi
npm run tauri -- "$mode" --config macos/tauri.conf.json --features tauri/macos-private-api "$@"
