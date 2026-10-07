# DemoHub24 Implementation Report

Status: 2026-09-01, Asia/Bangkok

The DemoHub24 source, compiled frontend, PostgreSQL database, NestJS API, Nginx virtual hosts, Cloudflare Tunnel route and security controls are deployed on the Windows 10 production PC.

## Runtime

- Source: `C:\DemoHub24\MockBank`
- Web root: `C:\DemoHub24\www`
- Protected configuration: `C:\DemoHub24\config\mockbank.env`
- PostgreSQL 18.4 portable runtime: `C:\DemoHub24\postgresql-runtime`
- Persistent data: `C:\DemoHub24\postgresql-data`
- API: NestJS on `127.0.0.1:4100`
- Nginx 1.30.4: `127.0.0.1:8080`
- Cloudflare tunnel: `demohub24.com`, healthy, wildcard published application `*.demohub24.com`

## Verified

- All fourteen web applications have distinct domain screens and return HTTPS 200 after one SSO login through Cloudflare.
- API health, Swagger and OpenAPI return HTTPS 200.
- Business APIs reject missing API keys and accept the four configured integration clients.
- Customer 360 returns persistent customer/account/card/fraud data.
- Card block remains `BLOCKED` after API restart and returns to `ACTIVE` only after explicit demo reset.
- Mobile reset and promise-to-pay persist and create audit/correlation records.
- Transfer posting atomically updates account balances, ledger entries and payment records. Card state, loan payment, collection PTP, mobile state, wealth holdings, fraud decisions, KYC decisions, campaign results and notification simulations persist in PostgreSQL.
- Acceptance transactions were executed successfully and remained queryable after the API restarted.
- A complete new-customer lifecycle was verified: customer creation, account opening, deposit, withdrawal, card issuance, card purchase/refund, loan booking, mobile registration, transfer/refund handling, investment, fraud alert, KYC verification, offer and notification. The customer and all related records remained available after API restart.
- `mfecbank.demohub24.com` provides the public landing page and deposit, card, loan and investment product pages. `ibank.demohub24.com` provides customer registration, login, portfolio, statements and transfers. `backend.demohub24.com` consolidates all staff applications under paths such as `/loan`, `/core` and `/card`.
- Customer self-registration now verifies four identity attributes against the Core Banking customer record, stores KYC and a trackable request reference, blocks login pending administrator approval, and supports approval/rejection, password reset, manual lock/unlock and a configurable 1–20 attempt automatic-lock policy in Core Banking.
- Internet Banking customers can download a branded PDF statement for each deposit account. The generated document includes customer/CIF and masked account details, chronological debit and credit entries, calculated running balances, closing and available balances, generation time, page numbering and a synthetic-data disclaimer.
- Public product pages now accept guest applications without login and authenticated applications through Internet Banking. Guest identity data is matched against existing CIF records or creates a new synthetic customer when no record exists. Every request remains pending for Admin approval; approval atomically provisions the selected deposit, card, loan or investment into the customer portfolio, while rejection provisions nothing. End-to-end acceptance covered all four product categories, both applicant types, public status tracking and rejection behavior.
- The complete Internet Banking access lifecycle was verified in production using a synthetic customer: pending login denial, approval, successful login, automatic lock at a temporary three-attempt policy, administrator unlock, password reset, successful login with the reset password, and restoration of the default five-attempt policy.
- Public landing/product navigation, lockout/unlock, active-session invalidation, customer login, balance mutation, audit history, transfer persistence and product-application persistence were verified through Cloudflare and again after API restart.
- Selected-card administration was verified with two cards: blocking the selected second card left the first card active. Selected-account admin deposit/withdrawal and a two-customer Internet Banking transfer were verified; the source debit, recipient credit and both ledger records committed atomically.
- Nginx syntax passes; existing `pbx.demohub24.com` remains preserved.
- PostgreSQL, API and Nginx use loopback listeners; Cloudflared is the public ingress.

## Startup and remaining administrator item

Cloudflared is an Automatic Windows service. Windows denied machine-service registration without elevation, so `DemoHub24-Startup.cmd` is installed in the current user's Startup folder. It launches `DemoHub24-Watchdog.ps1` after Windows sign-in; the watchdog checks PostgreSQL, API and Nginx every 20 seconds and automatically restarts a missing component. A controlled Nginx shutdown/recovery test passed. Starting PostgreSQL/API/Nginx before any user signs in still requires administrator elevation to register true machine services.

The portable PostgreSQL package omits `pg_dump`; the supplied PostgreSQL-native backup script therefore requires the full PostgreSQL client tools before the automated backup acceptance check can pass.

See `APPLICATION_CATALOG.md` for URLs and features, and the integration documents for Genesys, ServiceNow, Google AI and UiPath usage.
