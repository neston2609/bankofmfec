# MFEC Bank Public Website and Internet Banking

Public website: `https://mfecbank.demohub24.com`

Internet Banking: `https://ibank.demohub24.com`

The public website includes a greeting-led landing page, product-family navigation and individual detail pages for every deposit account, credit card, loan and investment. Catalogue cards provide separate `See more details` and `Apply now` actions. Each detail page contains a product overview, ideal customer profile, key benefits, eligibility, rates/fees, required documents, important conditions or risk disclosures, and guest/authenticated application actions.

## Internet Banking

Customer authentication is separate from the DemoHub24 staff SSO. Customers can self-register at `https://ibank.demohub24.com/register` by matching their Customer ID/CIF, synthetic ID, date of birth and registered mobile number against Core Banking. A successful identity match records KYC as verified and creates a traceable `PENDING_APPROVAL` request. A Core Banking administrator must approve it before login is enabled. Only a salted `scrypt` password hash is stored in PostgreSQL.

Security controls:

- Secure, HttpOnly, SameSite=Lax customer cookie
- Two-hour session duration
- Configurable automatic lockout after 1–20 failed attempts (default: five)
- Core Banking request approval/rejection, lock/unlock and password reset
- Public registration-status lookup by `IBREG-*` reference
- A lock invalidates an existing customer session immediately
- Customer can access only accounts belonging to the authenticated CIF

Customer functions:

- Relationship dashboard
- Deposit balances and recent account ledger
- Downloadable per-account PDF statements with debit, credit, running balance, closing balance and page numbering
- Card, loan and investment summaries
- External synthetic transfers
- Atomic internal-account transfers when the destination is another DemoHub24 account
- Exact beneficiary lookup by account ID or masked account number
- Recipient name confirmation before an internal transfer
- Automatic four-second balance and transaction refresh for signed-in customers
- Persistent product applications and references

## Product application and onboarding

Every public product page allows an application without requiring Internet Banking login. A guest supplies name, synthetic identity number, date of birth, mobile and email. The backend matches all identity attributes to an existing CIF when one exists; conflicting information is rejected. If no match exists, a new synthetic customer and CIF are created with KYC `NOT_VERIFIED`.

Signed-in Internet Banking customers can apply with their authenticated customer profile instead of re-entering identity data. All guest and authenticated applications are stored as `PENDING_APPROVAL` and receive an `APP-*` tracking reference. Administrators review requests in the Admin application and can approve or reject them. Approval atomically provisions the corresponding deposit account, credit card, loan or investment holding into the customer portfolio; rejection creates no product. Both decisions and provisioned resource IDs are audited and persisted.

All content, identifiers, rates, accounts and transactions are synthetic. The site does not connect to real payment, card or investment networks.
