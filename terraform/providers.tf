provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
    key_vault {
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
}

provider "helm" {
  kubernetes {
    host                   = try(module.aks.kube_host, "")
    client_certificate     = try(base64decode(module.aks.kube_client_certificate), "")
    client_key             = try(base64decode(module.aks.kube_client_key), "")
    cluster_ca_certificate = try(base64decode(module.aks.kube_ca_certificate), "")
  }
}

provider "kubernetes" {
  host                   = try(module.aks.kube_host, "")
  client_certificate     = try(base64decode(module.aks.kube_client_certificate), "")
  client_key             = try(base64decode(module.aks.kube_client_key), "")
  cluster_ca_certificate = try(base64decode(module.aks.kube_ca_certificate), "")
}