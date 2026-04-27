variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "resource_prefix" { type = string }
variable "labels" { type = map(string) }
variable "gke_service_account_email" { type = string }
variable "database_host" { type = string }
variable "database_name" { type = string }
variable "database_user" { type = string }
variable "database_password" { type = string sensitive = true }
variable "redis_host" { type = string }
variable "redis_port" { type = number }
variable "storage_bucket_name" { type = string }
