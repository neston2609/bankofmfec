# Linux Production Deployment

Do not run these steps until connected to the intended Linux production host. Inspect `nginx -v`, `nginx -T`, `psql --version`, services, firewall and open ports first. Back up every existing file before editing.

Install supported Node.js LTS, PostgreSQL client/server, Git and build tools using the distribution package policy. Create locked service user `demohub24`, `/opt/demohub24/mockbank`, `/var/www/demohub24/shared`, `/var/backups/demohub24`, and `/etc/demohub24/mockbank.env` mode 0600. Create local-only database/user, install dependencies, generate Prisma, apply migrations, seed, and build. Copy `apps/web/dist/*` to the web root. Review and install staged systemd and Nginx files, then validate with `systemd-analyze verify`, `nginx -t`, reload Nginx, and smoke-test each Host header locally before public DNS tests.

Installed during current workspace preparation: Node.js 24.19.0 via WinGet (`OpenJS.NodeJS.LTS`) because it is required to build and test the project. No server package was installed.
