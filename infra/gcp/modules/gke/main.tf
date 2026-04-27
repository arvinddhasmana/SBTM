# GKE Autopilot Module — Leverages GCP's fully managed Kubernetes
# Benefits: Auto-scaling, auto-upgrades, optimized resource allocation, security by default

resource "google_container_cluster" "gke" {
  provider = google-beta

  name     = "${var.resource_prefix}-gke"
  location = var.region
  project  = var.project_id

  # Enable Autopilot mode (GCP's managed Kubernetes)
  enable_autopilot = var.enable_autopilot

  # Network configuration
  network    = var.network_id
  subnetwork = var.subnet_id

  # IP allocation for pods and services
  ip_allocation_policy {
    cluster_secondary_range_name  = "gke-pods"
    services_secondary_range_name = "gke-services"
  }

  # Workload Identity (GCP's way to give pods access to GCP services)
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Binary Authorization (security - only allow signed container images)
  binary_authorization {
    evaluation_mode = var.enable_binary_authorization ? "PROJECT_SINGLETON_POLICY_ENFORCE" : "DISABLED"
  }

  # Release channel for automatic upgrades
  release_channel {
    channel = var.environment == "production" ? "REGULAR" : "RAPID"
  }

  # Enable useful features
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    network_policy_config {
      disabled = false
    }
    gcp_filestore_csi_driver_config {
      enabled = true
    }
    gcs_fuse_csi_driver_config {
      enabled = true
    }
  }

  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00" # 3 AM UTC
    }
  }

  # Enable GKE Dataplane V2 (eBPF-based networking)
  datapath_provider = "ADVANCED_DATAPATH"

  # Logging and monitoring
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
    managed_prometheus {
      enabled = var.enable_managed_prometheus
    }
  }

  # Private cluster configuration (nodes have no public IPs)
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false # Keep public endpoint for easier access
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  master_authorized_networks_config {
    # Allow access from anywhere (you can restrict this in production)
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "All networks"
    }
  }

  # Security
  enable_shielded_nodes = true

  # Cluster autoscaling (Autopilot handles this automatically)
  cluster_autoscaling {
    enabled = false # Not needed with Autopilot
  }

  # Labels
  resource_labels = var.labels

  # Prevent accidental deletion in production
  deletion_protection = var.environment == "production"

  lifecycle {
    ignore_changes = [
      # Ignore changes to node_pool as Autopilot manages it
      node_pool,
    ]
  }
}

# Create a Workload Identity service account for pods
resource "google_service_account" "gke_workload_identity" {
  account_id   = "${var.resource_prefix}-gke-wi"
  display_name = "SBTM ${var.environment} GKE Workload Identity"
  project      = var.project_id
}

# Grant necessary permissions to the service account
resource "google_project_iam_member" "workload_identity_bindings" {
  for_each = toset([
    "roles/secretmanager.secretAccessor",    # Access Secret Manager
    "roles/cloudsql.client",                 # Access Cloud SQL
    "roles/storage.objectAdmin",             # Access Cloud Storage
    "roles/monitoring.metricWriter",         # Write metrics
    "roles/logging.logWriter",               # Write logs
  ])

  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.gke_workload_identity.email}"
}

# Allow Kubernetes service account to impersonate GCP service account
resource "google_service_account_iam_member" "workload_identity_user" {
  service_account_id = google_service_account.gke_workload_identity.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[sbtm-${var.environment}-gcp/external-secrets]"
}
