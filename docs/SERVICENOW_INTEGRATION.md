# ServiceNow Integration

Use Customer 360 as the primary case enrichment call. Store the DemoHub customer ID and API correlation ID on the CSM case. Forward `X-ServiceNow-Case-ID` on every lookup/action so Admin audit can join the case, Genesys conversation, AI session, UiPath job and banking reference.
