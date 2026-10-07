# Windows Production Deployment

Production paths are `C:\DemoHub24\MockBank`, `C:\DemoHub24\www`, `C:\DemoHub24\config\mockbank.env`, `C:\DemoHub24\logs` and `C:\DemoHub24\backups`.

An elevated administrator must first approve PostgreSQL 17 installation. Create local database `demohub24_bank` and login `demohub24_app`, restrict `listen_addresses` to `127.0.0.1`, and do not add a public firewall rule for 5432. Generate the environment file with unique database/API/JWT/admin secrets and restrict its NTFS ACL to Administrators, SYSTEM and the API service identity.

Install the API as NSSM service `DemoHub24MockBankAPI` using `C:\Program Files\nodejs\node.exe`, argument `dist\main.js`, working directory `C:\DemoHub24\MockBank\apps\api`, automatic startup, AppExit restart, and stdout/stderr under `C:\DemoHub24\logs`. Apply environment variables to the service without placing secrets on command lines or in source control.

Review `deploy\windows\demohub24-nginx.inc.conf`, back up the entire existing Nginx `conf` directory, include it inside `http {}`, run `nginx -t`, and reload rather than terminate the process. Preserve the PBX server block and Cloudflare Tunnel service.
