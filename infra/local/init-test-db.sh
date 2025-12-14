#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	CREATE DATABASE sbms_test;
	GRANT ALL PRIVILEGES ON DATABASE sbms_test TO "$POSTGRES_USER";
    ALTER USER postgres WITH PASSWORD 'mysecretpassword';
EOSQL
