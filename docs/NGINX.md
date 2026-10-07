# Nginx routing

`deploy/windows/demohub24-nginx.inc.conf` is the production include for the Windows host. `deploy/nginx/demohub24.conf` is the portable Linux reference.

The consolidated routing model is:

- `mfecbank.demohub24.com` serves the public MFEC Bank website.
- `ibank.demohub24.com` serves customer registration and Internet Banking.
- `backend.demohub24.com` serves the staff portal and every back-office service by path, for example `/loan`, `/card`, `/core`, `/cif` and `/mobile`.
- `backend.demohub24.com/api`, `/docs` and `/openapi.json` expose integration endpoints and documentation.

The production include preserves `pbx.demohub24.com`, which remains in the parent Nginx configuration. Former application subdomains return permanent redirects to the consolidated backend paths.
