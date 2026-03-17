#!/bin/bash
set -e

# This script will be run by docker-entrypoint-initdb.d
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Ensure the user has a password
    ALTER USER wateradmin WITH PASSWORD 'waterpass123';
    
    -- Grant all privileges
    GRANT ALL PRIVILEGES ON DATABASE water_management TO wateradmin;
EOSQL

echo "PostgreSQL initialization complete!"
