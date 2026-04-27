variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "resource_prefix" { type = string }
variable "gke_cluster_name" { type = string }
variable "enable_uptime_checks" { type = bool }
variable "enable_alert_policies" { type = bool }
variable "notification_channels" { type = list(string) default = [] }
