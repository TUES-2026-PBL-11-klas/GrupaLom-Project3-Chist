output "resource_group_name" { value = azurerm_resource_group.main.name }
output "resource_group_location" { value = azurerm_resource_group.main.location }
output "vnet_id" { value = azurerm_virtual_network.main.id }
output "aks_subnet_id" { value = azurerm_subnet.aks.id }
output "public_subnet_id" { value = azurerm_subnet.public.id }
output "db_subnet_id" { value = azurerm_subnet.db.id }
