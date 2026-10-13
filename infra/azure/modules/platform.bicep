targetScope = 'resourceGroup'

param location string
param namePrefix string
param storageAccountNameOverride string
param postgresServerNameOverride string
param keyVaultNameOverride string
param vmName string
param vmSize string
param vmAdminUsername string

@secure()
param vmAdminSshPublicKey string

param sshSourceAddressPrefix string
param postgresAdminUsername string

@secure()
param postgresAdminPassword string

param postgresSkuName string
param postgresStorageSizeGB int
param postgresBackupRetentionDays int
param postgresAvailabilityZone string
param storageSkuName string
param mediaContainerName string
param mediaContainerPublicAccess string
param vmOsDiskSizeGB int
param vmOsDiskSku string
param deployRoleAssignments bool
param tags object

var uniqueSuffix = uniqueString(subscription().id, resourceGroup().id)
var compactPrefix = toLower(replace(namePrefix, '-', ''))
var generatedStorageAccountName = take('${compactPrefix}${uniqueSuffix}', 24)
var storageAccountName = empty(storageAccountNameOverride)
  ? generatedStorageAccountName
  : toLower(storageAccountNameOverride)
var postgresServerName = empty(postgresServerNameOverride)
  ? toLower(take('${namePrefix}-db-${uniqueSuffix}', 63))
  : toLower(postgresServerNameOverride)
var keyVaultName = empty(keyVaultNameOverride)
  ? toLower(take('${namePrefix}-kv-${uniqueSuffix}', 24))
  : toLower(keyVaultNameOverride)
var vnetName = '${namePrefix}-vnet'
var subnetName = 'backend'
var nsgName = '${namePrefix}-backend-nsg'
var publicIpName = '${vmName}-pip'
var nicName = '${vmName}-nic'
var cloudInit = replace(
  loadTextContent('../cloud-init/backend-vm.yaml'),
  '__ADMIN_USERNAME__',
  vmAdminUsername
)
var keyVaultSecretsUserRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '4633458b-17de-408a-b874-0445c86b69e6'
)
var storageBlobDataContributorRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  'ba92f5b4-2d11-453d-a403-e96b0029c9fe'
)

resource nsg 'Microsoft.Network/networkSecurityGroups@2024-05-01' = {
  name: nsgName
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        name: 'Allow-SSH'
        properties: {
          priority: 300
          access: 'Allow'
          direction: 'Inbound'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '22'
          sourceAddressPrefix: sshSourceAddressPrefix
          destinationAddressPrefix: '*'
        }
      }
      {
        name: 'Allow-HTTP'
        properties: {
          priority: 320
          access: 'Allow'
          direction: 'Inbound'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '80'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
      {
        name: 'Allow-HTTPS'
        properties: {
          priority: 340
          access: 'Allow'
          direction: 'Inbound'
          protocol: 'Tcp'
          sourcePortRange: '*'
          destinationPortRange: '443'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2024-05-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [
        '10.0.0.0/16'
      ]
    }
  }
}

resource backendSubnet 'Microsoft.Network/virtualNetworks/subnets@2024-05-01' = {
  parent: vnet
  name: subnetName
  properties: {
    addressPrefix: '10.0.0.0/24'
  }
}

resource publicIp 'Microsoft.Network/publicIPAddresses@2024-05-01' = {
  name: publicIpName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
    publicIPAddressVersion: 'IPv4'
  }
}

resource nic 'Microsoft.Network/networkInterfaces@2024-05-01' = {
  name: nicName
  location: location
  tags: tags
  properties: {
    networkSecurityGroup: {
      id: nsg.id
    }
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          privateIPAllocationMethod: 'Dynamic'
          subnet: {
            id: backendSubnet.id
          }
          publicIPAddress: {
            id: publicIp.id
          }
        }
      }
    ]
  }
}

resource vm 'Microsoft.Compute/virtualMachines@2024-11-01' = {
  name: vmName
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    hardwareProfile: {
      vmSize: vmSize
    }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: 'ubuntu-24_04-lts'
        sku: 'server'
        version: 'latest'
      }
      osDisk: {
        name: '${vmName}-osdisk'
        createOption: 'FromImage'
        diskSizeGB: vmOsDiskSizeGB
        managedDisk: {
          storageAccountType: vmOsDiskSku
        }
      }
    }
    osProfile: {
      computerName: vmName
      adminUsername: vmAdminUsername
      customData: base64(cloudInit)
      linuxConfiguration: {
        disablePasswordAuthentication: true
        provisionVMAgent: true
        ssh: {
          publicKeys: [
            {
              path: '/home/${vmAdminUsername}/.ssh/authorized_keys'
              keyData: vmAdminSshPublicKey
            }
          ]
        }
      }
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nic.id
          properties: {
            primary: true
          }
        }
      ]
    }
  }
}

resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresServerName
  location: location
  tags: tags
  sku: {
    name: postgresSkuName
    tier: 'Burstable'
  }
  properties: {
    administratorLogin: postgresAdminUsername
    administratorLoginPassword: postgresAdminPassword
    availabilityZone: postgresAvailabilityZone
    version: '16'
    authConfig: {
      activeDirectoryAuth: 'Disabled'
      passwordAuth: 'Enabled'
    }
    backup: {
      backupRetentionDays: postgresBackupRetentionDays
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
    storage: {
      autoGrow: 'Enabled'
      storageSizeGB: postgresStorageSizeGB
    }
  }
}

resource postgresVmFirewallRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  parent: postgres
  name: 'AllowBackendVm'
  properties: {
    startIpAddress: publicIp.properties.ipAddress
    endIpAddress: publicIp.properties.ipAddress
  }
}

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  kind: 'StorageV2'
  sku: {
    name: storageSkuName
  }
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: mediaContainerPublicAccess != 'None'
    allowSharedKeyAccess: true
    defaultToOAuthAuthentication: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: storage
  name: 'default'
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
  }
}

resource mediaContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobService
  name: mediaContainerName
  properties: {
    publicAccess: mediaContainerPublicAccess
  }
}

resource keyVault 'Microsoft.KeyVault/vaults@2024-11-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: []
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    enabledForDeployment: false
    enabledForDiskEncryption: false
    enabledForTemplateDeployment: false
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      bypass: 'AzureServices'
      defaultAction: 'Allow'
    }
  }
}

resource vmKeyVaultSecretsUser 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployRoleAssignments) {
  name: guid(keyVault.id, vm.id, keyVaultSecretsUserRoleDefinitionId)
  scope: keyVault
  properties: {
    principalId: vm.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: keyVaultSecretsUserRoleDefinitionId
  }
}

resource vmStorageBlobDataContributor 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (deployRoleAssignments) {
  name: guid(storage.id, vm.id, storageBlobDataContributorRoleDefinitionId)
  scope: storage
  properties: {
    principalId: vm.identity.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: storageBlobDataContributorRoleDefinitionId
  }
}

output vmName string = vm.name
output vmPublicIpAddress string = publicIp.properties.ipAddress
output postgresServerName string = postgres.name
output postgresHostName string = postgres.properties.fullyQualifiedDomainName
output postgresJdbcUrl string = 'jdbc:postgresql://${postgres.properties.fullyQualifiedDomainName}:5432/postgres?sslmode=require'
output storageAccountName string = storage.name
output mediaContainerUrl string = '${storage.properties.primaryEndpoints.blob}${mediaContainer.name}'
output keyVaultName string = keyVault.name
output keyVaultUri string = keyVault.properties.vaultUri
