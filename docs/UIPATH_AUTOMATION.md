# UiPath Automation

## Block Card
Search `[data-testid="customer-search"]`; read `[data-testid="card-number"]`; click `[data-testid="block-card-button"]`; select `[data-testid="block-reason"]`; confirm `[data-testid="confirm-action"]`.

## Reset Mobile Device
Search customer; click `[data-testid="reset-registration-button"]`; confirm `[data-testid="confirm-action"]`.

## Promise to Pay
Search customer; enter `[data-testid="ptp-amount"]` and `[data-testid="ptp-date"]`; click `[data-testid="save-ptp-button"]`; confirm. Forward `X-UiPath-Job-ID` when the UI calls the legacy endpoint and capture the returned reference.
