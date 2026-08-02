targetScope = 'subscription'

@description('Azure region for the migrated SkillSwap resources.')
param location string = 'australiaeast'

@description('Resource group created in the target subscription.')
param resourceGroupName string = 'skillswap-prod-rg'

@minLength(3)
@maxLength(12)
@description('Lowercase prefix used when globally unique resource names are generated.')
param namePrefix string = 'skillswap'

@description('Optional storage account name override. Leave empty to generate a unique name.')
param storageAccountNameOverride string = ''

@description('Optional PostgreSQL server name override. Leave empty to generate a unique name.')
param postgresServerNameOverride string = ''

@description('Optional Key Vault name override. Leave empty to generate a unique name.')
param keyVaultNameOverride string = ''

@description('Name of the backend virtual machine.')
param vmName string = 'skillswap-backend'

@description('Virtual machine size. The current documented production size is Standard_B2ats_v2.')
param vmSize string = 'Standard_B2ats_v2'

@description('Linux administrator/deployment username.')
param vmAdminUsername string = 'azureuser'

@secure()
@description('SSH public key only. Never supply the private key.')
param vmAdminSshPublicKey string

@description('CIDR allowed to SSH to the VM. "*" preserves the current GitHub-hosted-runner deployment model but is not recommended long term.')
param sshSourceAddressPrefix string = '*'

@description('PostgreSQL administrator login.')
param postgresAdminUsername string = 'dbadmin'

@secure()
@description('New PostgreSQL administrator password for the target server. Do not commit it to a parameter file.')
param postgresAdminPassword string

@description('PostgreSQL Flexible Server SKU.')
param postgresSkuName string = 'Standard_B1ms'

@description('PostgreSQL storage size in GiB.')
@allowed([
  32
  64
  128
  256
  512
  1024
  2048
  4096
  8192
  16384
  32767
])
param postgresStorageSizeGB int = 32

@minValue(7)
@maxValue(35)
@description('PostgreSQL backup retention in days.')
param postgresBackupRetentionDays int = 7

@description('PostgreSQL availability zone. The current documentation records zone 1.')
param postgresAvailabilityZone string = '1'

@description('Storage replication SKU.')
@allowed([
  'Standard_LRS'
  'Standard_GRS'
  'Standard_RAGRS'
  'Standard_ZRS'
  'Standard_GZRS'
  'Standard_RAGZRS'
])
param storageSkuName string = 'Standard_LRS'

@description('Existing application contract. The real production container is media.')
param mediaContainerName string = 'media'

@description('Keep Blob-level anonymous read access to preserve current public media URLs.')
@allowed([
  'None'
  'Blob'
  'Container'
])
param mediaContainerPublicAccess string = 'Blob'

@description('OS disk size in GiB. Confirm this against the source VM before production deployment.')
param vmOsDiskSizeGB int = 30

@description('OS disk storage type.')
@allowed([
  'Standard_LRS'
  'StandardSSD_LRS'
  'Premium_LRS'
])
param vmOsDiskSku string = 'StandardSSD_LRS'

@description('Deploy role assignments for the VM managed identity. Requires Owner or User Access Administrator in the target subscription.')
param deployRoleAssignments bool = true

@description('Common Azure resource tags.')
param tags object = {
  application: 'SkillSwap'
  environment: 'production'
  managedBy: 'Bicep'
}

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module platform './modules/platform.bicep' = {
  name: 'skillswap-platform'
  scope: resourceGroup
  params: {
    location: location
    namePrefix: namePrefix
    storageAccountNameOverride: storageAccountNameOverride
    postgresServerNameOverride: postgresServerNameOverride
    keyVaultNameOverride: keyVaultNameOverride
    vmName: vmName
    vmSize: vmSize
    vmAdminUsername: vmAdminUsername
    vmAdminSshPublicKey: vmAdminSshPublicKey
    sshSourceAddressPrefix: sshSourceAddressPrefix
    postgresAdminUsername: postgresAdminUsername
    postgresAdminPassword: postgresAdminPassword
    postgresSkuName: postgresSkuName
    postgresStorageSizeGB: postgresStorageSizeGB
    postgresBackupRetentionDays: postgresBackupRetentionDays
    postgresAvailabilityZone: postgresAvailabilityZone
    storageSkuName: storageSkuName
    mediaContainerName: mediaContainerName
    mediaContainerPublicAccess: mediaContainerPublicAccess
    vmOsDiskSizeGB: vmOsDiskSizeGB
    vmOsDiskSku: vmOsDiskSku
    deployRoleAssignments: deployRoleAssignments
    tags: tags
  }
}

output resourceGroupName string = resourceGroup.name
output vmName string = platform.outputs.vmName
output vmPublicIpAddress string = platform.outputs.vmPublicIpAddress
output vmAdminUsername string = vmAdminUsername
output postgresServerName string = platform.outputs.postgresServerName
output postgresHostName string = platform.outputs.postgresHostName
output postgresJdbcUrl string = platform.outputs.postgresJdbcUrl
output storageAccountName string = platform.outputs.storageAccountName
output mediaContainerName string = mediaContainerName
output mediaContainerUrl string = platform.outputs.mediaContainerUrl
output keyVaultName string = platform.outputs.keyVaultName
output keyVaultUri string = platform.outputs.keyVaultUri
