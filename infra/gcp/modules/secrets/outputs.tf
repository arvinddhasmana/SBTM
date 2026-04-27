output "jwt_secret_id" { value = google_secret_manager_secret.jwt_secret.secret_id }
output "database_url_secret_id" { value = google_secret_manager_secret.database_url.secret_id }
output "db_password_secret_id" { value = google_secret_manager_secret.db_password.secret_id }
output "redis_url_secret_id" { value = google_secret_manager_secret.redis_url.secret_id }
output "storage_bucket_secret_id" { value = google_secret_manager_secret.storage_bucket.secret_id }
