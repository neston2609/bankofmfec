# Windows Production Server Baseline

Discovery date: 2026-08-31 (Asia/Bangkok)

| Item | Observation |
|---|---|
| OS | Microsoft Windows 10 Pro 22H2, build 19045, x64 |
| CPU | Intel Core i5-6500 @ 3.20 GHz |
| RAM | 8.36 GB |
| Disk | C: approximately 71 GB free at discovery |
| Windows Firewall | Enabled for Domain, Private and Public profiles |
| Git | 2.53.0.windows.3 |
| Node.js | 24.19.0 LTS at `C:\Program Files\nodejs` |
| npm | 11.17.0 |
| PostgreSQL | Missing; PostgreSQL 17.11 installation was canceled at the elevation prompt |
| NSSM | 2.24-101-g897c7ad installed with WinGet |
| Nginx | 1.30.4, `C:\Users\ton_s\Documents\Codex\nginx\nginx-1.30.4\nginx.exe` |
| Nginx listener | `127.0.0.1:8080` only |
| Cloudflare | `Cloudflared` Windows service, Running/Automatic, token stored outside project |
| Existing application | `pbx.demohub24.com` proxies to `192.168.30.14`; it must be preserved |

The existing Nginx configuration passed `nginx -T`. It contains a wildcard/default host and the PBX virtual host. No Nginx configuration was changed during discovery. The Cloudflare token was not read or copied.

Windows 10 reached end of support for standard editions on 2025-10-14; continued Internet-facing use is an operational security risk unless the device is covered by an applicable Extended Security Updates program. Migration to a supported Windows release should be planned.
