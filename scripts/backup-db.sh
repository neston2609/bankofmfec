#!/usr/bin/env bash
set -euo pipefail
install -d -m 0700 /var/backups/demohub24
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
pg_dump --format=custom --file="/var/backups/demohub24/demohub24_bank_${stamp}.dump" "$DATABASE_URL"
find /var/backups/demohub24 -type f -name '*.dump' -mtime +30 -delete
