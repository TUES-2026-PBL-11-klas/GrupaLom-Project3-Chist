output "kubelet_object_id" {
  description = "Object ID of the AKS kubelet managed identity – used by AKV access policy"
  value       = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
}

output "aks_cluster_name" { value = azurerm_kubernetes_cluster.aks.name }
output "kube_config_raw" {
  value     = azurerm_kubernetes_cluster.aks.kube_config_raw
  sensitive = true
}
output "kube_host" {
  value     = azurerm_kubernetes_cluster.aks.kube_config[0].host
  sensitive = true
}
output "kube_client_certificate" {
  value     = azurerm_kubernetes_cluster.aks.kube_config[0].client_certificate
  sensitive = true
}
output "kube_client_key" {
  value     = azurerm_kubernetes_cluster.aks.kube_config[0].client_key
  sensitive = true
}
output "kube_ca_certificate" {
  value     = azurerm_kubernetes_cluster.aks.kube_config[0].cluster_ca_certificate
  sensitive = true
}