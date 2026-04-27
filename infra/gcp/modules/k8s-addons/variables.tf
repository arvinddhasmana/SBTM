variable "project_id" { type = string }
variable "environment" { type = string }
variable "resource_prefix" { type = string }
variable "install_external_secrets" { type = bool default = true }
variable "install_nginx_ingress" { type = bool default = true }
variable "install_cert_manager" { type = bool default = true }
variable "enable_managed_prometheus" { type = bool default = false }
