# Operations

Health endpoints: `/health`, `/api/health`, `/api/health/database`. View API logs with `journalctl -u demohub24-mockbank-api`. Validate configuration before reload. A normal restart must preserve PostgreSQL data. After a deployment, smoke-test every hostname, API docs, authentication, database health, legacy selectors, audit rows and full correlation headers.
