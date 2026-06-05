output "resource_group_name" {
  value = module.network.resource_group_name
}

output "vnet_id" {
  value = module.network.vnet_id
}

output "acr_login_server" {
  value = module.acr.acr_login_server
}

output "acr_name" {
  value = module.acr.acr_name
}

output "aks_cluster_name" {
  value = module.aks.aks_cluster_name
}

output "aks_kube_config" {
  value     = module.aks.kube_config_raw
  sensitive = true
}

output "cnpg_connection_host" {
  value = "cnpg-cluster-rw.db.svc.cluster.local"
}

# Azure Key Vault
output "key_vault_name" {
  description = "Name of the Azure Key Vault – use in GitHub Actions AZURE_KEY_VAULT_NAME secret"
  value       = module.akv.key_vault_name
}

output "key_vault_uri" {
  description = "URI of the Azure Key Vault"
  value       = module.akv.key_vault_uri
}
