# DemoHub24 consolidated application URLs

Staff users sign in at `https://backend.demohub24.com/login`. The Secure, HttpOnly session cookie is shared across `.demohub24.com` for eight hours. Customer Internet Banking uses its own Core Banking-managed customer session.

| Application | Production URL | Purpose |
|---|---|---|
| MFEC Bank public website | https://mfecbank.demohub24.com | Product catalogue, details and guest or existing-customer applications |
| Internet Banking | https://ibank.demohub24.com | Customer registration, login, portfolio, transfers and PDF statements |
| Operations Portal | https://backend.demohub24.com | Central staff launcher and environment overview |
| Customer / CIF | https://backend.demohub24.com/cif | Customer master, CIF, segment, consent, risk and KYC summary |
| Core Banking | https://backend.demohub24.com/core | Accounts, transactions and Internet Banking administration |
| Credit Card | https://backend.demohub24.com/card | Card issuance, controls, transactions and replacement |
| Loan | https://backend.demohub24.com/loan | Loan products, balances, due dates and collections context |
| Collection | https://backend.demohub24.com/collection | Portfolio lookup and promise-to-pay workflows |
| Mobile Banking | https://backend.demohub24.com/mobile | Device and mobile-access administration |
| Payment / Transfer | https://backend.demohub24.com/payment | Transfers, failures, reversals and refunds |
| Investment / Wealth | https://backend.demohub24.com/wealth | Synthetic portfolios, values, risk and suitability |
| Fraud | https://backend.demohub24.com/fraud | Fraud alerts, scores and investigations |
| KYC / Identity | https://backend.demohub24.com/kyc | Verification and identity simulation |
| Campaign / Offers | https://backend.demohub24.com/campaign | Campaign targets and next-best offers |
| Notification | https://backend.demohub24.com/notify | Simulated customer messaging |
| Lab Administration | https://backend.demohub24.com/admin | Health, audit and lab operations |
| REST API | https://backend.demohub24.com/api | Banking integration endpoints |
| Swagger | https://backend.demohub24.com/docs | Interactive API documentation |
| OpenAPI | https://backend.demohub24.com/openapi.json | Machine-readable integration contract |

The former per-application subdomains redirect to their matching path under `backend.demohub24.com` for compatibility.
