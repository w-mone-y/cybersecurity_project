#!/usr/bin/env bash
# Double-click launcher for macOS
# Opens Terminal and runs run.sh from this folder
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
if [ ! -x run.sh ]; then
  chmod +x run.sh 2>/dev/null || true
fi
exec /bin/zsh -lc "'${DIR}/run.sh'" 
