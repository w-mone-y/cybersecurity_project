#!/usr/bin/env bash
set -Eeuo pipefail

# One-click dev server for CyberSec Academy
# - Picks a free port
# - Starts a static HTTP server (python3/php/ruby/busybox as available)
# - Opens the site in the default browser

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
DEFAULT_PORT="8000"
PORT="${PORT:-$DEFAULT_PORT}"
HOST="127.0.0.1"
URL="http://$HOST:$PORT"
SERVER_PID=""

is_port_free() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    ! lsof -n -iTCP:"$p" -sTCP:LISTEN >/dev/null 2>&1
  else
    # Fallback: try connecting (likely fails fast if free)
    ! nc -z "$HOST" "$p" >/dev/null 2>&1
  fi
}

pick_free_port() {
  local start="$1"; local max_tries=20; local p="$start"
  for ((i=0;i<max_tries;i++)); do
    if is_port_free "$p"; then
      echo "$p"; return 0
    fi
    p=$((p+1))
  done
  echo "$start" # give back the original even if busy
}

PORT="$(pick_free_port "$PORT")"
URL="http://$HOST:$PORT"

start_server() {
  echo "→ Serving $SCRIPT_DIR at $URL"
  if command -v python3 >/dev/null 2>&1; then
    (cd "$SCRIPT_DIR" && python3 -m http.server "$PORT") &
    SERVER_PID=$!
    echo "✓ Using python3 http.server (pid=$SERVER_PID)"
  elif command -v python >/dev/null 2>&1; then
    (cd "$SCRIPT_DIR" && python -m SimpleHTTPServer "$PORT") &
    SERVER_PID=$!
    echo "✓ Using python (SimpleHTTPServer) (pid=$SERVER_PID)"
  elif command -v php >/dev/null 2>&1; then
    (cd "$SCRIPT_DIR" && php -S "$HOST:$PORT" -t "$SCRIPT_DIR") &
    SERVER_PID=$!
    echo "✓ Using php -S (pid=$SERVER_PID)"
  elif command -v ruby >/dev/null 2>&1; then
    (cd "$SCRIPT_DIR" && ruby -run -e httpd "$SCRIPT_DIR" -p "$PORT") &
    SERVER_PID=$!
    echo "✓ Using ruby -run httpd (pid=$SERVER_PID)"
  elif command -v busybox >/dev/null 2>&1; then
    (cd "$SCRIPT_DIR" && busybox httpd -f -p "$PORT" -h "$SCRIPT_DIR") &
    SERVER_PID=$!
    echo "✓ Using busybox httpd (pid=$SERVER_PID)"
  else
    echo "✗ No simple HTTP server found (tried python3/python/php/ruby/busybox)." >&2
    echo "  Please install Python 3 or PHP, or run: python3 -m http.server $PORT" >&2
    exit 1
  fi
}

wait_ready() {
  local tries=50
  for ((i=0;i<tries;i++)); do
    if command -v curl >/dev/null 2>&1; then
      if curl -sSf "$URL" >/dev/null 2>&1; then return 0; fi
    else
      # If curl not available, just sleep a moment and hope for the best
      sleep 0.2; return 0
    fi
    sleep 0.1
  done
  return 1
}

cleanup() {
  echo "\n↩ Stopping server..."
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

start_server
if wait_ready; then
  echo "➤ Opening $URL"
  if [[ "$OSTYPE" == darwin* ]] && command -v open >/dev/null 2>&1; then
    open "$URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 || true
  else
    echo "(Please open $URL in your browser)"
  fi
else
  echo "⚠ Server not responding yet. You can still try: $URL"
fi

echo "Press Ctrl+C to stop."
wait "$SERVER_PID"
