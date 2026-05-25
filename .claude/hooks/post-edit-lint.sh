#!/usr/bin/env bash
# Runs ESLint on edited files after every Edit/Write.
# Static analysis only — no typecheck, no secret scan, no stop-hooks.
set -e

payload=$(cat)
file=$(echo "$payload" | jq -r '.tool_input.file_path // empty')

if [ -z "$file" ] || [ ! -f "$file" ]; then
  exit 0
fi

case "$file" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

pnpm eslint "$file" --max-warnings=0 2>&1 | tail -20
