resource "azurerm_kubernetes_cluster" "aks" {
  name                = "aks-${var.project_name}-${var.environment}"
  location            = var.location
  resource_group_name = var.rg_name
  dns_prefix          = "${var.project_name}-${var.environment}"
  kubernetes_version  = "1.33"
  sku_tier            = "Free"

  default_node_pool {
    name                        = "default"
    temporary_name_for_rotation = "temppool"
    node_count                  = 1
    vm_size                     = var.aks_node_vm_size
    vnet_subnet_id              = var.aks_subnet_id
    orchestrator_version        = "1.33"
    max_pods                    = 60
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    load_balancer_sku = "standard"
    service_cidr      = "172.16.0.0/16"
    dns_service_ip    = "172.16.0.10"
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
  lifecycle {
    ignore_changes = [
      default_node_pool[0].upgrade_settings
    ]
  }
}

resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id                     = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = var.acr_id
  skip_service_principal_aad_check = true
}

data "azurerm_resources" "aks_nsg" {
  resource_group_name = "MC_${var.rg_name}_${azurerm_kubernetes_cluster.aks.name}_${var.location}"
  type                = "Microsoft.Network/networkSecurityGroups"
  depends_on          = [azurerm_kubernetes_cluster.aks]
}

resource "azurerm_network_security_rule" "allow_http" {
  name                        = "allow-http"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "80"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = "MC_${var.rg_name}_${azurerm_kubernetes_cluster.aks.name}_${var.location}"
  network_security_group_name = data.azurerm_resources.aks_nsg.resources[0].name
  depends_on                  = [azurerm_kubernetes_cluster.aks]
  lifecycle {
    ignore_changes        = [network_security_group_name]
    create_before_destroy = false
  }
}

resource "azurerm_network_security_rule" "allow_https" {
  name                        = "allow-https"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = "MC_${var.rg_name}_${azurerm_kubernetes_cluster.aks.name}_${var.location}"
  network_security_group_name = data.azurerm_resources.aks_nsg.resources[0].name
  depends_on                  = [azurerm_kubernetes_cluster.aks]
  lifecycle {
    ignore_changes        = [network_security_group_name]
    create_before_destroy = false
  }
}