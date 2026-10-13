# Azure Migration Runbook

Last reviewed: 2026-10-13

## 1. Document Purpose

This runbook moves the SkillSwap backend platform from the current Azure subscription to a new one by rebuilding it with Bicep and copying the data across. It covers everything after the resources exist: database, media, stored URLs, deployment secrets, DNS, TLS, verification, rollback, and decommissioning.

Creating the resources is documented in [`infra/azure/README.md`](../../infra/azure/README.md). Follow that README to choose between a resource move and a rebuild, validate the template with `what-if`, and deploy it. This runbook starts where the README ends.

Related documents:

- Current production layout: `doc/cloud/SkillSwap-Cloud-Deployment.md`
- Day-to-day deployment and secrets list: `docs/06-operations/Deployment-Runbook.md`
- Hosting decision: `docs/09-decision-records/ADR-003-Use-Azure-VM-for-Backend-Hosting.md`

## 2. What Changes And What Does Not

| Item | Changes? | Notes |
|---|---|---|
| VM public IP | Yes | New static IP from the Bicep deployment output `vmPublicIpAddress`. |
| PostgreSQL server name | Yes | Generated unless `postgresServerNameOverride` is set. Database name stays `postgres`. |
| Storage account name | Yes | Storage account names are globally unique, so the new account cannot reuse `skillswapstorages` while the old one exists. Container name stays `media`. |
| Media URLs stored in the database | Yes | Must be rewritten. See [Section 7](#7-rewrite-stored-media-urls). |
| SSH key pair | Yes | A new key pair is created for the new VM. |
| Database admin password | Yes | Chosen when deploying Bicep. |
| API hostname `api.<domain>` | No | DNS A record is repointed to the new IP. |
| Frontend on Vercel | No | `VITE_API_BASE_URL` keeps pointing at `api.<domain>`. |
| Clerk issuer, JWKS, keys | No | Clerk is independent of the Azure subscription. |
| CORS configuration | No | It allows frontend origins, which do not change. |
| GHCR image | No | The same image is pulled by the new VM. |

## 3. Secrets And Values You Supply

No secret is stored in the repository. During the migration you create or collect these values yourself.

| Value | When | Where it goes |
|---|---|---|
| New PostgreSQL admin password | Bicep deployment (`postgresAdminPassword`, `@secure()`) | GitHub secret `DB_PASSWORD` |
| New SSH public key | Bicep deployment (`vmAdminSshPublicKey`, `@secure()`) | Stays on the VM |
| New SSH private key | Generated with the public key | GitHub secret `SSH_PRIVATE_KEY`; your machine |
| New storage connection string | After deployment, from Storage account → Access keys | GitHub secret `AZURE_STORAGE_CONNECTION_STRING` |
| Short-lived SAS tokens | During the media copy only | Command line only; let them expire |

Generate the SSH key pair before deploying Bicep:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/skillswap-new -C "skillswap-backend"
# public key:  ~/.ssh/skillswap-new.pub  -> vmAdminSshPublicKey
# private key: ~/.ssh/skillswap-new      -> GitHub secret SSH_PRIVATE_KEY
```

The new Key Vault is created empty and is not required for this migration. Populating it is an optional follow-up ([Section 13](#13-optional-move-runtime-secrets-into-key-vault)).

## 4. Migration Timeline

| Phase | Production impact | Section |
|---|---|---|
| A. Provision target with Bicep | None | `infra/azure/README.md` |
| B. Prepare the new VM and lower DNS TTL | None | 5 |
| C. Rehearse the data copy | None | 6, 7 |
| D. Cutover: freeze, final copy, URL rewrite, deploy, DNS | API down for the cutover window | 8, 9 |
| E. Verify | None | 10 |
| F. Decommission the old environment | None | 12 |

Run phases A to C at least a day before the cutover. Rehearsing the copy on real data shows how long the cutover window will be and surfaces problems while production is untouched.

## 5. Prepare The New VM

### 5.1 Confirm cloud-init finished

```bash
ssh -i ~/.ssh/skillswap-new azureuser@<NEW_VM_IP>
cloud-init status --wait          # expect: status: done
docker --version
sudo nginx -t
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/   # 502 is expected: no backend yet
```

### 5.2 Allow the new VM to read the old database

The copy in [Section 6](#6-copy-the-database) runs from the new VM. Add a firewall rule on the **old** PostgreSQL server for the new VM's public IP: old server → Settings → Networking → Add firewall rule, start and end IP both `<NEW_VM_IP>`.

Bicep already allows the new VM on the **new** server through the `AllowBackendVm` rule.

### 5.3 Lower the DNS TTL

At least one day before the cutover, lower the TTL of the `api.<domain>` A record at the DNS provider (Spaceship) to 300 seconds. Clients then pick up the new IP within minutes instead of hours.

## 6. Copy The Database

Run `pg_dump` and `pg_restore` from the new VM with the `postgres:16` image. The client version then matches the server version, and the VM is already allowed through both firewalls. Cloud Shell's client may be older than PostgreSQL 16 and refuse to dump.

```bash
mkdir -p ~/migration && cd ~/migration

# Dump the old database (prompts for the old password).
docker run --rm -it -v "$PWD":/backup postgres:16 \
  pg_dump "host=skillswap-db-server.postgres.database.azure.com port=5432 dbname=postgres user=<OLD_ADMIN_USER> sslmode=require" \
  --format=custom --no-owner --no-privileges --file=/backup/skillswap.dump

# Restore into the new database (prompts for the new password).
docker run --rm -it -v "$PWD":/backup postgres:16 \
  pg_restore --dbname="host=<NEW_DB_HOST> port=5432 dbname=postgres user=dbadmin sslmode=require" \
  --no-owner --no-privileges --exit-on-error /backup/skillswap.dump
```

`--no-owner --no-privileges` drops the old admin user's ownership and grants, so the restore works under the new `dbadmin` user. The schema uses no PostgreSQL extensions (UUIDs are generated in Java), so nothing has to be allow-listed on the new server.

Compare row counts on both servers:

```sql
SELECT 'user_account' AS t, count(*) FROM user_account
UNION ALL SELECT 'workshops', count(*) FROM workshops
UNION ALL SELECT 'workshop_participants', count(*) FROM workshop_participants
UNION ALL SELECT 'notifications', count(*) FROM notifications
UNION ALL SELECT 'memory_entries', count(*) FROM memory_entries
UNION ALL SELECT 'memory_media', count(*) FROM memory_media
UNION ALL SELECT 'user_skill', count(*) FROM user_skill;
```

Confirm the optimistic-locking columns came across: `memory_entries.version` and `workshops.version` must exist, or the new backend fails Hibernate schema validation at startup.

## 7. Rewrite Stored Media URLs

The database stores absolute media URLs such as `https://skillswapstorages.blob.core.windows.net/media/memory%2F<uuid>.png`. After the copy they still point at the old account. Rewriting them is required for two reasons:

- Images disappear once the old account is deleted.
- `AzureBlobUrlValidator` only accepts URLs from the configured account. Without the rewrite, saving an existing memory fails with `400` because its cover URL belongs to the old account.

### 7.1 Copy the blobs

Create two short-lived SAS tokens (Storage account → Shared access signature, expiry a few hours):

- Old account: Blob service, Container and Object resource types, Read and List.
- New account: Blob service, Container and Object resource types, Read, List, Write, and Create.

AzCopy is preinstalled in Cloud Shell:

```bash
azcopy sync \
  "https://skillswapstorages.blob.core.windows.net/media?<OLD_SAS>" \
  "https://<NEW_STORAGE_ACCOUNT>.blob.core.windows.net/media?<NEW_SAS>" \
  --recursive
```

`sync` only copies what is missing or changed, so the same command can run again during the cutover to pick up last-minute uploads. Compare blob counts and total size of both containers afterwards, and open a few copied images through the new URL in a browser.

### 7.2 Rewrite the URLs in the new database

Run on the **new** database. Only the host prefix changes; the container and the blob path stay the same.

```sql
BEGIN;

UPDATE memory_entries
SET cover_url = replace(cover_url, 'https://skillswapstorages.blob.core.windows.net/', 'https://<NEW_STORAGE_ACCOUNT>.blob.core.windows.net/'),
    content   = replace(content,   'https://skillswapstorages.blob.core.windows.net/', 'https://<NEW_STORAGE_ACCOUNT>.blob.core.windows.net/');

UPDATE memory_media
SET media_url = replace(media_url, 'https://skillswapstorages.blob.core.windows.net/', 'https://<NEW_STORAGE_ACCOUNT>.blob.core.windows.net/');

UPDATE user_account
SET avatar_url = replace(avatar_url, 'https://skillswapstorages.blob.core.windows.net/', 'https://<NEW_STORAGE_ACCOUNT>.blob.core.windows.net/');

UPDATE workshops
SET image_url = replace(image_url, 'https://skillswapstorages.blob.core.windows.net/', 'https://<NEW_STORAGE_ACCOUNT>.blob.core.windows.net/');

-- Expect 0 in every row before committing.
SELECT 'memory_entries' AS t, count(*) FROM memory_entries
  WHERE cover_url LIKE '%skillswapstorages%' OR content LIKE '%skillswapstorages%'
UNION ALL SELECT 'memory_media', count(*) FROM memory_media WHERE media_url LIKE '%skillswapstorages%'
UNION ALL SELECT 'user_account', count(*) FROM user_account WHERE avatar_url LIKE '%skillswapstorages%'
UNION ALL SELECT 'workshops', count(*) FROM workshops WHERE image_url LIKE '%skillswapstorages%';

COMMIT;   -- or ROLLBACK if any count is not 0
```

`content` covers both the memory front-matter cover line and inline body images. Avatars stored by Clerk are external URLs and are not affected by the `replace`.

## 8. Cutover

Everything up to this point can be redone. From step 8.1 the API is unavailable until step 8.6 completes, so announce a maintenance window.

### 8.1 Freeze writes on the old environment

```bash
ssh -i <OLD_PRIVATE_KEY> azureuser@20.248.207.99
docker stop backend-api
```

Stopping the old backend guarantees nothing is written to the old database or storage after the final copy. Leave the container in place, because it is the rollback path.

### 8.2 Final data copy

Repeat [Section 6](#6-copy-the-database) and [Section 7](#7-rewrite-stored-media-urls) against the frozen data:

1. Drop and recreate the new database contents, or restore with `pg_restore --clean --if-exists`.
2. Run the final `pg_dump` and `pg_restore`.
3. Run `azcopy sync` again.
4. Run the URL rewrite and confirm all counts are 0.

### 8.3 Update GitHub Actions secrets

Repository → Settings → Secrets and variables → Actions:

| Secret | New value |
|---|---|
| `AZURE_VM_IP` | `<NEW_VM_IP>` |
| `AZURE_VM_USER` | `azureuser` (Bicep default `vmAdminUsername`) |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/skillswap-new` |
| `DB_URL` | Bicep output `postgresJdbcUrl` |
| `DB_USERNAME` | `dbadmin` (Bicep default `postgresAdminUsername`) |
| `DB_PASSWORD` | Password chosen in phase A |
| `AZURE_STORAGE_CONNECTION_STRING` | New account connection string |
| `CLERK_ISSUER_URI`, `CLERK_JWKS_URI`, `CLERK_SECRET_KEY` | Unchanged |

### 8.4 Deploy to the new VM

Actions → **Build and Deploy Backend** → open the latest successful run on `main` → **Re-run all jobs**. The workflow reads the updated secrets and deploys the same image to the new VM.

Check the backend through Nginx on port 80 before touching DNS:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://<NEW_VM_IP>/health                 # expect 204
curl -s http://<NEW_VM_IP>/api/v1/memories | grep -o '"coverUrl":"[^"]*"' | head -3  # expect the new storage host
```

If `/health` does not answer, read the startup log on the new VM with `docker logs backend-api --tail 100`. The usual causes are a wrong `DB_URL`, a firewall rule, or missing `version` columns.

### 8.5 Move TLS to the new VM

The cloud-init Nginx site only listens on port 80 with `server_name _`. Install the production certificate before switching DNS, so HTTPS works the moment clients reach the new IP.

Copy the existing Let's Encrypt state from the old VM. The certificate is bound to the domain, not the IP, so it stays valid:

```bash
# On the old VM
sudo tar czf ~/letsencrypt.tgz -C /etc letsencrypt
# Copy letsencrypt.tgz to the new VM (scp through your machine), then on the new VM:
sudo apt-get install -y certbot python3-certbot-nginx
sudo tar xzf ~/letsencrypt.tgz -C /etc
```

Then replace `/etc/nginx/sites-available/skillswap-api` with the HTTPS configuration from `doc/cloud/SkillSwap-Cloud-Deployment.md` Section 6: port 80 redirects to HTTPS, and port 443 uses `/etc/letsencrypt/live/<domain>/` and proxies to `127.0.0.1:8080`. Run `sudo nginx -t && sudo systemctl reload nginx`, then `sudo certbot renew --dry-run` to confirm renewal works on the new VM.

If copying the certificate is not possible, switch DNS first and run `sudo certbot --nginx -d api.<domain>` once the A record resolves to the new IP. HTTPS fails until it completes.

### 8.6 Switch DNS

Point the `api.<domain>` A record to `<NEW_VM_IP>`. Track propagation with:

```bash
nslookup api.<domain>
curl -s -o /dev/null -w "%{http_code}\n" https://api.<domain>/health   # expect 204
```

## 9. Cutover Checklist

- [ ] Old backend container stopped (8.1)
- [ ] Final `pg_restore` succeeded and row counts match (8.2)
- [ ] Final `azcopy sync` done and blob counts match (8.2)
- [ ] URL rewrite committed with all counts at 0 (8.2)
- [ ] GitHub secrets updated (8.3)
- [ ] Deploy run succeeded and `http://<NEW_VM_IP>/health` returns 204 (8.4)
- [ ] Nginx serves HTTPS with the production certificate (8.5)
- [ ] DNS points to the new IP and `https://api.<domain>/health` returns 204 (8.6)

## 10. Verify

Run through these on the production frontend after DNS has switched:

1. Sign in with Clerk as a member and as an admin.
2. Public workshop list and memory wall load, and their images come from the new storage host.
3. An admin edits and saves a published memory. This proves the version check and the URL validator accept migrated data.
4. Upload a new memory image and a new avatar. The returned URL uses the new account.
5. Approve or reject a test workshop and confirm the notification appears.
6. Run a backend redeploy (push to `main` or re-run the workflow) to confirm CI/CD targets the new VM.

## 11. Rollback

| When | How |
|---|---|
| Before DNS switch (8.1 to 8.5) | Restore the old values of the GitHub secrets, then on the old VM run `docker start backend-api`. Nothing has reached users yet. |
| After DNS switch | Point the A record back to `20.248.207.99` and start the old container. Data written on the new environment since the switch is not in the old database, so decide quickly, or copy those rows back by hand. |

Keep the old environment intact, with its VM stopped but not deleted, until [Section 12](#12-decommission-the-old-environment).

## 12. Decommission The Old Environment

After at least one week without issues:

1. Take a final `pg_dump` of the old database and keep it outside Azure.
2. Confirm no database row references `skillswapstorages` (rerun the check query in 7.2).
3. Remove the old database firewall rule for the new VM.
4. Delete the old `SkillSwap_RG` resource group. This removes the old VM, disk, IP, network, database, and storage account.
5. Update `doc/cloud/SkillSwap-Cloud-Deployment.md` with the new resource names and IP.

## 13. Optional: Move Runtime Secrets Into Key Vault

This step is not needed for the migration. Do it as a separate change after the new environment is stable.

1. Grant yourself the **Key Vault Secrets Officer** role on the new vault. The vault uses RBAC authorization, so being subscription Owner does not let you write secrets. Bicep only gave the VM read access (Key Vault Secrets User).
2. Add the database password and the storage connection string as secrets.
3. Change the deployment so the VM reads them with its managed identity instead of receiving them from GitHub secrets in `docker run`.
4. Remove the corresponding GitHub secrets.

`CLERK_SECRET_KEY` does not need to move. No backend code reads `clerk.secret-key`, so it can be removed from the deployment altogether. The longer-term improvement is replacing the storage connection string with managed-identity access to Blob Storage. Bicep already grants the VM Storage Blob Data Contributor, but the backend needs code changes to use it.
