# SkillSwap Azure account migration infrastructure

This directory contains the first-pass Bicep definition for rebuilding the
current SkillSwap Azure platform in another Azure subscription.

It creates:

- A production resource group in `australiaeast`
- Ubuntu 24.04 VM (`Standard_B2ats_v2` by default)
- Static public IP, VNet, subnet, NIC, and NSG
- PostgreSQL Flexible Server 16 (`Standard_B1ms`, 32 GiB by default)
- StorageV2 account and the real `media` Blob container
- Standard Key Vault with RBAC enabled
- A system-assigned VM managed identity
- Optional Key Vault Secrets User and Storage Blob Data Contributor assignments
- Docker, Nginx, a localhost reverse proxy, and a 2 GiB swap file through cloud-init

It does **not**:

- Deploy the Spring Boot container
- Configure DNS, Certbot, or the production TLS certificate
- Copy PostgreSQL data
- Copy blobs under `media/avatars`, `media/memory`, or `media/workshops`
- Change GitHub, Vercel, Clerk, OpenAI, or Anthropic secrets
- Add secret values to Key Vault

## Important account decision

Before choosing between an Azure resource move and a Bicep rebuild, compare the
tenant IDs of the source and destination subscriptions:

```powershell
az account show --subscription "<source-subscription>" --query tenantId -o tsv
az account show --subscription "<target-subscription>" --query tenantId -o tsv
```

Do not commit or publish the subscription IDs. Only the answer "same tenant" or
"different tenant" is needed for migration planning.

- Same tenant: some resources may support a direct subscription move. This can
  preserve globally unique names and service endpoints.
- Different tenant: Azure Resource Manager does not directly move resources to
  the new tenant. Rebuild the target with Bicep and copy the data.

The Bicep files remain useful as the desired-state definition in either case.

## Information to confirm before production deployment

No passwords, keys, SAS tokens, connection strings, private SSH keys, or tenant
IDs should be shared in screenshots or committed to this repository.

Please confirm these non-secret settings:

1. Whether the source and target subscriptions are in the same Entra tenant.
2. Target subscription quota/availability for `Standard_B2ats_v2`,
   PostgreSQL `Standard_B1ms`, and availability zone `1` in Australia East.
3. Source VM OS disk size and disk SKU.
4. PostgreSQL **Compute + storage**, **Networking**, **Backups**, and
   **Authentication** pages. Redact usernames if desired.
5. Storage account **Configuration**, **Networking**, **Data protection**, and
   the `media` container **Change access level** page.
6. Whether the production API will keep the same DNS name.
7. Approximate PostgreSQL database size and Blob object count/total size.
8. Whether GitHub-hosted runners must continue to SSH directly to the VM.

The supplied screenshot already confirms that the active container is `media`.
The apparent folders are Blob name prefixes and do not need separate Bicep
resources.

## Target subscription prerequisites

The operator needs:

- An active target Azure subscription
- Azure CLI with Bicep support, or Azure PowerShell
- Permission to create resources in the target subscription
- `Owner` or `User Access Administrator` for the managed-identity role
  assignments
- A new PostgreSQL admin password
- An SSH **public** key

Register these resource providers if the target subscription has not used them:

```powershell
az provider register --namespace Microsoft.Compute
az provider register --namespace Microsoft.Network
az provider register --namespace Microsoft.Storage
az provider register --namespace Microsoft.DBforPostgreSQL
az provider register --namespace Microsoft.KeyVault
az provider register --namespace Microsoft.ManagedIdentity
az provider register --namespace Microsoft.Authorization
```

If the operator only has `Contributor`, set `deployRoleAssignments=false`, then
have an Owner assign the roles separately.

## Validate before deployment

Install or update Azure CLI, then run:

```powershell
az bicep build --file infra/azure/main.bicep
```

Select the target subscription:

```powershell
az login
az account set --subscription "<target-subscription>"
az account show --query "{subscription:name, tenant:tenantId}" -o table
```

Run `what-if` before creating anything. Supply the SSH public key and PostgreSQL
password from local environment variables or another secure source. Do not put
the password in a tracked `.bicepparam` file.

```powershell
$env:SKILLSWAP_SSH_PUBLIC_KEY = Get-Content -LiteralPath "<public-key-path>" -Raw
$env:SKILLSWAP_POSTGRES_PASSWORD = Read-Host "New PostgreSQL admin password" -MaskInput

az deployment sub what-if `
  --name "skillswap-migration-preview" `
  --location "australiaeast" `
  --template-file "infra/azure/main.bicep" `
  --parameters `
    vmAdminSshPublicKey="$env:SKILLSWAP_SSH_PUBLIC_KEY" `
    postgresAdminPassword="$env:SKILLSWAP_POSTGRES_PASSWORD"
```

Only after reviewing `what-if`, use the same parameters with:

```powershell
az deployment sub create `
  --name "skillswap-migration" `
  --location "australiaeast" `
  --template-file "infra/azure/main.bicep" `
  --parameters `
    vmAdminSshPublicKey="$env:SKILLSWAP_SSH_PUBLIC_KEY" `
    postgresAdminPassword="$env:SKILLSWAP_POSTGRES_PASSWORD"

Remove-Item Env:\SKILLSWAP_POSTGRES_PASSWORD
```

The secure Bicep parameter prevents the database password from being stored in
Azure deployment history. Environment variables above are local and temporary;
clear the password after the command.

## Key Vault scope

The first deployment creates an empty Standard Key Vault. It deliberately does
not migrate GitHub-only OpenAI or Anthropic API keys, nor any Clerk key.

After the target environment is verified, likely Azure runtime secrets are:

- PostgreSQL password
- Azure Storage connection string, until the backend uses managed identity

Secret population and application integration should be a separate reviewed
step. The VM already receives a managed identity and, when role assignments are
enabled, permission to read Key Vault secrets and access Blob data.

## Data and cutover are separate

Bicep creates resources; it does not move data.

The later migration runbook needs to cover:

1. `pg_dump` from the source PostgreSQL server.
2. Restore into the target PostgreSQL server.
3. AzCopy from the source `media` container to the target `media` container.
4. Verification of blob count and representative objects.
5. Updating stored media URLs if the storage account hostname changes.
6. Updating GitHub deployment values such as VM IP, database URL/credentials,
   and storage connection string.
7. DNS cutover and Certbot/TLS provisioning.
8. Application smoke tests before the source environment is removed.

Storage account names are globally unique. A Bicep rebuild normally produces a
new account name, so copied database rows can still contain URLs pointing to the
old account. Plan an explicit URL rewrite or preserve the storage account by a
supported same-tenant resource move.
