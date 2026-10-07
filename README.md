# DemoHub24 – Bank of MFEC Mock Banking Lab

Synthetic, persistent banking demonstration environment for Genesys Cloud CX, ServiceNow CSM, Google AI Agent and UiPath. It contains a central NestJS/Prisma API and one hostname-aware React/Vite build for all modern and legacy applications.

## Local build

1. Copy `.env.example` to `.env` and set PostgreSQL/security values.
2. `npm install`
3. `npm run db:generate && npm run db:migrate && npm run db:seed`
4. `npm run dev:api` and `npm run dev`

Data is synthetic. Never use this project for real banking or credit decisions.
