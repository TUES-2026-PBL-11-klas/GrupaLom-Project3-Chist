variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "location" {
  type = string
}

variable "rg_name" {
  type = string
}

variable "github_actions_object_id" {
  description = "Object ID of the AKS kubelet managed identity"
  type        = string
}

variable "github_actions_client_id" {
  description = "clientId from AZURE_CREDENTIALS JSON"
  type        = string
}

variable "acr_registry" {
  type = string
}

variable "acr_username" {
  type = string
}

variable "acr_password" {
  type      = string
  sensitive = true
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "jwt_secret" {
  type      = string
  sensitive = true
}

variable "computer_vision_endpoint" {
  type = string
}

variable "computer_vision_key" {
  type      = string
  sensitive = true
}

variable "mail_host" {
  type = string
}

variable "mail_port" {
  type = string
}

variable "mail_username" {
  type = string
}

variable "mail_password" {
  type      = string
  sensitive = true
}

variable "rabbitmq_password" {
  description = "Password for the RabbitMQ 'chist' user"
  type        = string
  sensitive   = true
}

variable "aks_kubelet_object_id" {
  description = "Object ID of AKS kubelet managed identity"
  type        = string
}