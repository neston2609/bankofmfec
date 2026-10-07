# Backup and Restore

The systemd timer runs a custom-format `pg_dump` daily at 02:15 Asia/Bangkok and retains 30 days in `/var/backups/demohub24`, which must never be under a web root. Restore requires the exact typed phrase `RESTORE DEMOHUB24`. Test restores into a separate database before relying on backups.
