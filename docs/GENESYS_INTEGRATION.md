# Genesys Cloud CX Integration

Use the base URL `https://backend.demohub24.com` and configure the credential header `X-API-Key` with the DemoHub24 Genesys key. Also forward `X-Correlation-ID` and `X-Genesys-Conversation-ID` so every AVA interaction can be traced in the bank audit log. Never place the API key in an Architect flow variable or response.

## Loan Data Actions

### Get all current loans and interest

`GET /api/genesys/customers/{customerId}/loans`

The response contains `totalOutstandingPrincipal`, `weightedAverageInterestRate`, and a `loans` array with the current amount and annual interest rate for every loan.

### Get a specific loan and interest

`GET /api/genesys/customers/{customerId}/loans?loanNumber={loanNumber}`

The response uses the same stable schema, but the `loans` array contains only the requested loan. A loan that does not belong to the customer returns HTTP 404.

### Calculate mortgage payoff

`GET /api/genesys/customers/{customerId}/loans/{loanNumber}/payoff?payoffDate={dd/mm/yyyy}`

Example: `payoffDate=31/12/2026`. The response provides remaining principal, annual and daily interest rates, days until payoff, accrued interest, total payoff amount, and the `ACT/365` day-count convention. This action calculates a quote only; it does not post a payment.

### Change loan interest

`PATCH /api/genesys/customers/{customerId}/loans/{loanNumber}/interest`

Request body:

```json
{
  "annualInterestRate": 6.25,
  "reason": "Approved mortgage retention rate"
}
```

The rate must be from 0 through 50. The response includes the previous rate, new rate, effective timestamp, and audit reference. Configure this as a secured write Data Action and require AVA confirmation before execution.

## Genesys Data Action request headers

```text
X-API-Key: ${credential.bankApiKey}
X-Correlation-ID: ${input.correlationId}
X-Genesys-Conversation-ID: ${input.conversationId}
Content-Type: application/json
```

Other supported read actions include `/api/customers/search?q=`, `/api/customers/{id}/360`, `/api/customers/{id}/kyc`, `/api/cards/{id}/transactions`, `/api/customers/{id}/payments`, and `/api/customers/{id}/offers`.
