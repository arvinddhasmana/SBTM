output "instance_name" { value = google_sql_database_instance.postgres.name }
output "connection_name" { value = google_sql_database_instance.postgres.connection_name }
output "instance_ip_address" { value = google_sql_database_instance.postgres.private_ip_address }
output "database_name" { value = google_sql_database.database.name }
output "database_user" { value = google_sql_user.db_user.name }
output "database_password" { value = random_password.db_password.result sensitive = true }
