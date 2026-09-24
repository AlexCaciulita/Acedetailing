# Railway deployment

Project: `nova-detailing` (`def57658-c3aa-4c77-b524-ad695c5b48fe`).
Service: `nova-web`, production environment.
Preview: https://nova-web-production-4896.up.railway.app

Railway builds the Dockerfile from GitHub branch `codex/railway-migration` in
`AlexCaciulita/Acedetailing`. Pushes to this branch deploy automatically. The
runtime uses Node 22, serves the Vite build, and checks `/health` before release.

The `/data` Railway volume stores CRM collections; `NOVA_DATA_DIR=/data` is
required. Keep one replica because storage is file based. The read-only vehicle
finish-record catalogue remains in `/app/data/records.json` in the image.

Secrets are Railway service variables. The existing Netlify `ADMIN_PASSWORD_HASH`
is preserved. Do not commit `.env`, CRM snapshots, or production credentials.
Email delivery, OpenRouter chat, and PayU credentials were absent on the source
service at migration time; configure those separately before advertising them.

DNS is being migrated from Hostgate to Cloudflare (registration stays at
Hostgate). Preserve the Microsoft 365 MX, SPF TXT and autodiscover CNAME records.
The website uses the Railway-provided apex and www CNAME targets and ownership
TXT records. Check Railway domain status and TLS before considering DNS complete.

## Validation

- `npm test`
- `npm run build`
- Check `/health`, public pages, assets, redirects and `/api/admin/session`.
- Verify unauthenticated `/api/admin/bootstrap` is denied and private documents
  and `.env` are not publicly served.
- Compare migrated CRM collections with the source snapshot and verify persistence
  after restart before deleting any source data.

## Rollback

Keep Netlify and its `nova-admin/state-v1` Blob until migration is verified.
Old DNS: apex A `75.2.60.5`, www CNAME `novasdetailing.netlify.app`.
Old authoritative servers: `ns1.hostgate.ro`, `ns2.hostgate.ro`.
If rollback is needed after Railway receives new submissions, reconcile data first.

Build and deployment settings are stored directly on the Railway service:
Dockerfile `Dockerfile`, health check `/health` with a 120-second timeout, one
replica, and restart on failure with at most 10 retries. This avoids reliance on
the deprecated `railway.json` format. Preserve service variables and volumes when
changing deployment configuration.
