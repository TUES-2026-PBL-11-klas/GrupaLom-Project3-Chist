data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                       = "kv-${var.project_name}-${var.environment}"
  location                   = var.location
  resource_group_name        = var.rg_name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false

  access_policy {
    tenant_id          = data.azurerm_client_config.current.tenant_id
    object_id          = data.azurerm_client_config.current.object_id
    secret_permissions = ["Get", "List", "Set", "Delete", "Recover", "Backup", "Restore", "Purge"]
  }

  access_policy {
    tenant_id          = data.azurerm_client_config.current.tenant_id
    object_id          = var.github_actions_object_id
    secret_permissions = ["Get", "List"]
  }

  access_policy {
    tenant_id          = data.azurerm_client_config.current.tenant_id
    object_id          = var.aks_kubelet_object_id
    secret_permissions = ["Get", "List"]
  }

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# ── ACR ───────────────────────────────────────────────────────
resource "azurerm_key_vault_secret" "acr_registry" {
  name         = "acr-registry"
  value        = var.acr_registry
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "acr_username" {
  name         = "acr-username"
  value        = var.acr_username
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "acr_password" {
  name         = "acr-password"
  value        = var.acr_password
  key_vault_id = azurerm_key_vault.main.id
}

# ── Database ──────────────────────────────────────────────────
resource "azurerm_key_vault_secret" "db_username" {
  name         = "db-username"
  value        = var.db_username
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = var.db_password
  key_vault_id = azurerm_key_vault.main.id
}

# ── Per-service DB URLs ───────────────────────────────────────
resource "azurerm_key_vault_secret" "db_url_users" {
  name         = "db-url-users"
  value        = "jdbc:postgresql://cnpg-cluster-rw.db.svc.cluster.local:5432/chist_users"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_url_reports" {
  name         = "db-url-reports"
  value        = "jdbc:postgresql://cnpg-cluster-rw.db.svc.cluster.local:5432/chist_reports"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_url_verification" {
  name         = "db-url-verification"
  value        = "jdbc:postgresql://cnpg-cluster-rw.db.svc.cluster.local:5432/chist_verification"
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "db_url_notif" {
  name         = "db-url-notif"
  value        = "jdbc:postgresql://cnpg-cluster-rw.db.svc.cluster.local:5432/chist_notif"
  key_vault_id = azurerm_key_vault.main.id
}

# ── App ───────────────────────────────────────────────────────
resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret"
  value        = var.jwt_secret
  key_vault_id = azurerm_key_vault.main.id
}

# ── Computer Vision ───────────────────────────────────────────
resource "azurerm_key_vault_secret" "computer_vision_endpoint" {
  name         = "computer-vision-endpoint"
  value        = var.computer_vision_endpoint
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "computer_vision_key" {
  name         = "computer-vision-key"
  value        = var.computer_vision_key
  key_vault_id = azurerm_key_vault.main.id
}

# ── Mail ──────────────────────────────────────────────────────
resource "azurerm_key_vault_secret" "mail_host" {
  name         = "mail-host"
  value        = var.mail_host
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "mail_port" {
  name         = "mail-port"
  value        = var.mail_port
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "mail_username" {
  name         = "mail-username"
  value        = var.mail_username
  key_vault_id = azurerm_key_vault.main.id
}

resource "azurerm_key_vault_secret" "mail_password" {
  name         = "mail-password"
  value        = var.mail_password
  key_vault_id = azurerm_key_vault.main.id
}

# ── RabbitMQ ──────────────────────────────────────────────────
resource "azurerm_key_vault_secret" "rabbitmq_password" {
  name         = "rabbitmq-password"
  value        = var.rabbitmq_password
  key_vault_id = azurerm_key_vault.main.id
}