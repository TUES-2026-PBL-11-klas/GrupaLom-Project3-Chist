variable "location" {
  type = string
}

variable "environment" {
  type = string
}

variable "project_name" {
  type = string
}

variable "vnet_cidr" {
  type = string
}

variable "public_subnet_cidr" {
  type = string
}

variable "aks_subnet_cidr" {
  type = string
}

variable "db_subnet_cidr" {
  type = string
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

variable "aks_node_vm_size" {
  type = string
}

variable "argocd_hostname" {
  type = string
}

variable "jwt_secret" {
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
  type      = string
  sensitive = true
}

variable "github_actions_object_id" {
  type = string
}

variable "github_actions_client_id" {
  type = string
}