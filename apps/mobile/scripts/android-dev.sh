#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
PORT="${RCT_METRO_PORT:-8082}"

if [[ "${1:-}" == "--clean" ]]; then
  echo "› Cleaning Android build..."
  (cd android && ./gradlew clean)
fi

# If Metro is already on our port (e.g. from a previous session), expo run:android
# will exit after install instead of keeping Metro alive in this terminal.
if lsof -ti :"$PORT" >/dev/null 2>&1; then
  echo "› Stopping stale process on port $PORT..."
  lsof -ti :"$PORT" | xargs kill -9 2>/dev/null || true
  sleep 1
fi

echo "› Building and installing native app..."
if npx expo run:android --port "$PORT"; then
  :
else
  exit $?
fi

# expo run:android finished without keeping Metro attached — start it for dev.
echo "› Starting Metro on port $PORT..."
exec npx expo start --dev-client --port "$PORT"
