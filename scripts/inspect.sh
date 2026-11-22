#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

inspector_command="npx @modelcontextprotocol/inspector --transport http --server-url http://127.0.0.1:3000/mcp"

if [[ -n "${MCP_INSPECT_TOKEN:-}" ]]; then
  inspector_command="$inspector_command --header \"Authorization: Bearer $MCP_INSPECT_TOKEN\""
fi

if [[ -n "${ADVBOX_TOKEN:-}" ]]; then
  inspector_command="$inspector_command --header \"X-ADVBOX-API-KEY: $ADVBOX_TOKEN\""
fi

exec npx concurrently -k -n server,inspector "npm:start" "$inspector_command"
