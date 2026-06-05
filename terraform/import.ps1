# Rebuilds the Terraform state from existing Azure/Kubernetes resources.
# Run from the terraform/ directory:  .\import.ps1
#
# Prerequisites: az login, kubectl context pointing at aks-chist-dev

$sub          = "bf606b72-98ef-41a9-b412-4f95aea302d6"
$rg           = "rg-chist-dev"
$kv           = "kv-chist-dev"
$aksManagedRg = "MC_rg-chist-dev_aks-chist-dev_swedencentral"

function ti($addr, $id) {
    Write-Host "`n→ $addr" -ForegroundColor Cyan
    terraform import -var-file dev.tfvars $addr $id
}

# ── Network ───────────────────────────────────────────────────────────
ti "module.network.azurerm_resource_group.main"   "/subscriptions/$sub/resourceGroups/$rg"
ti "module.network.azurerm_virtual_network.main"  "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.Network/virtualNetworks/vnet-chist-dev"
ti "module.network.azurerm_subnet.aks"            "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.Network/virtualNetworks/vnet-chist-dev/subnets/subnet-aks-dev"
ti "module.network.azurerm_subnet.db"             "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.Network/virtualNetworks/vnet-chist-dev/subnets/subnet-db-dev"
ti "module.network.azurerm_subnet.public"         "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.Network/virtualNetworks/vnet-chist-dev/subnets/subnet-public-dev"
ti "module.network.azurerm_network_security_group.public" `
   "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.Network/networkSecurityGroups/nsg-public-dev"
ti "module.network.azurerm_subnet_network_security_group_association.public" `
   "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.Network/virtualNetworks/vnet-chist-dev/subnets/subnet-public-dev"

# ── ACR ───────────────────────────────────────────────────────────────
ti "module.acr.azurerm_container_registry.acr" `
   "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.ContainerRegistry/registries/acrchistdev"

# ── AKS ───────────────────────────────────────────────────────────────
ti "module.aks.azurerm_kubernetes_cluster.aks" `
   "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.ContainerService/managedClusters/aks-chist-dev"

$acrScope = "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.ContainerRegistry/registries/acrchistdev"
$raId = az role assignment list --scope $acrScope --query "[?roleDefinitionName=='AcrPull'].id | [0]" -o tsv
ti "module.aks.azurerm_role_assignment.aks_acr_pull" $raId

# NSG rules live in the AKS-managed resource group (dynamic NSG name)
$nsgName = az network nsg list --resource-group $aksManagedRg --query "[0].name" -o tsv
$nsgBase = "/subscriptions/$sub/resourceGroups/$aksManagedRg/providers/Microsoft.Network/networkSecurityGroups/$nsgName"
ti "module.aks.azurerm_network_security_rule.allow_http"  "$nsgBase/securityRules/allow-http"
ti "module.aks.azurerm_network_security_rule.allow_https" "$nsgBase/securityRules/allow-https"

# ── Key Vault ─────────────────────────────────────────────────────────
ti "module.akv.azurerm_key_vault.main" `
   "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.KeyVault/vaults/$kv"

# Secrets require versioned IDs — look each one up dynamically
$kvSecrets = [ordered]@{
    "acr_registry"              = "acr-registry"
    "acr_username"              = "acr-username"
    "acr_password"              = "acr-password"
    "db_username"               = "db-username"
    "db_password"               = "db-password"
    "db_url_users"              = "db-url-users"
    "db_url_reports"            = "db-url-reports"
    "db_url_verification"       = "db-url-verification"
    "db_url_notif"              = "db-url-notif"
    "jwt_secret"                = "jwt-secret"
    "computer_vision_endpoint"  = "computer-vision-endpoint"
    "computer_vision_key"       = "computer-vision-key"
    "mail_host"                 = "mail-host"
    "mail_port"                 = "mail-port"
    "mail_username"             = "mail-username"
    "mail_password"             = "mail-password"
    "rabbitmq_password"         = "rabbitmq-password"
}
foreach ($entry in $kvSecrets.GetEnumerator()) {
    $secretId = az keyvault secret show --vault-name $kv --name $entry.Value --query "id" -o tsv
    ti "module.akv.azurerm_key_vault_secret.$($entry.Key)" $secretId
}

# ── Cognitive Services ────────────────────────────────────────────────
ti "module.cognitive.azurerm_cognitive_account.vision" `
   "/subscriptions/$sub/resourceGroups/$rg/providers/Microsoft.CognitiveServices/accounts/cv-chist-dev"

# ── Fetch kubeconfig before Kubernetes imports ────────────────────────
Write-Host "`nFetching kubeconfig for aks-chist-dev..." -ForegroundColor Yellow
az aks get-credentials --resource-group $rg --name aks-chist-dev --overwrite-existing

# ── Helm releases ─────────────────────────────────────────────────────
ti "module.kubernetes.helm_release.nginx_ingress" "ingress-nginx/ingress-nginx"
ti "module.kubernetes.helm_release.cnpg_operator" "cnpg-system/cnpg"
ti "module.kubernetes.helm_release.argocd"        "argocd/argocd"
ti "module.kubernetes.helm_release.argocd_apps"   "argocd/argocd-apps"

# ── Kubernetes namespaces ─────────────────────────────────────────────
ti "module.kubernetes.kubernetes_namespace.db"    "db"
ti "module.kubernetes.kubernetes_namespace.chist" "chist"

# ── Kubernetes secrets ────────────────────────────────────────────────
# Import existing secrets so Terraform can update them in-place.
# If a secret does not exist yet (import fails with "not found"), that is
# fine — Terraform will create it fresh on the next apply.
ti "module.kubernetes.kubernetes_secret.cnpg_app_credentials" "db/cnpg-app-credentials"
ti "module.kubernetes.kubernetes_secret.rabbitmq_secret"      "chist/rabbitmq-secret"
ti "module.kubernetes.kubernetes_secret.secret_user"          "chist/secret-user"
ti "module.kubernetes.kubernetes_secret.secret_report"        "chist/secret-report"
ti "module.kubernetes.kubernetes_secret.secret_verification"  "chist/secret-verification"
ti "module.kubernetes.kubernetes_secret.secret_notification"  "chist/secret-notification"

Write-Host "`n✓ Import pass complete." -ForegroundColor Green
Write-Host "  Review the output above — failed imports appear as errors but are non-fatal if the resource does not exist yet." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Next: terraform apply -var-file dev.tfvars" -ForegroundColor Green
