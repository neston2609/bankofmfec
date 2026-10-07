# API Security

Terminate HTTPS using the existing Cloudflare/Nginx strategy. Keep API port and PostgreSQL loopback-only. Production must enforce separate hashed API keys for Genesys, ServiceNow, Google AI and UiPath, rate limits, DTO validation and role-based sessions. Secrets live only in mode-0600 `/etc/demohub24/mockbank.env`. Never log keys or unnecessary synthetic profile fields.
