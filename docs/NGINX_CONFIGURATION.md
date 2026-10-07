# Nginx Configuration

Nginx 1.30.4 runs from `C:\Users\ton_s\Documents\Codex\nginx\nginx-1.30.4` and listens only on `127.0.0.1:8080` behind Cloudflare Tunnel. The proposed additive include is `deploy\windows\demohub24-nginx.inc.conf`.

Before installation, copy the complete `conf` directory to `C:\DemoHub24\backups\nginx\<timestamp>`. Insert one `include` inside the existing `http` block, validate with the discovered executable and `-p` prefix, then run `nginx -s reload`. Never overwrite the existing `pbx.demohub24.com` proxy.
