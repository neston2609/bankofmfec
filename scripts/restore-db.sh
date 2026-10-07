#!/usr/bin/env bash
set -euo pipefail
file="${1:-}"
[[ -f "$file" ]] || { echo 'Usage: restore-db.sh /absolute/path/file.dump'; exit 2; }
read -r -p 'Type RESTORE DEMOHUB24 to continue: ' answer
[[ "$answer" == 'RESTORE DEMOHUB24' ]] || { echo 'Cancelled'; exit 1; }
pg_restore --clean --if-exists --no-owner --dbname="$DATABASE_URL" "$file"
