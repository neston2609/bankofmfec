# Architecture

Cloudflare/TLS → existing Nginx → shared React static build or NestJS API on `127.0.0.1:4100` → Prisma → local-only PostgreSQL. PostgreSQL is the only authoritative store. The UI selects its domain module from the subdomain, enabling one audited component system and dedicated legacy modes for Card, Collection and Mobile.

Genesys owns engagement/routing, ServiceNow is the system of work, Google AI supplies optional tool reasoning, and UiPath performs the deliberately non-REST legacy writes.
