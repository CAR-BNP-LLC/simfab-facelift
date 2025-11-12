#!/bin/bash

# Guard and self-heal script for the SimFab PostgreSQL database.
# Usage: ./protect-database.sh [container_name] [database_name]

set -euo pipefail

CONTAINER_NAME="${1:-${PG_CONTAINER:-simfab-db}}"
DATABASE_NAME="${2:-${PG_DATABASE:-simfab_dev}}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

log() {
  printf '[%s] %s\n' "$(date --utc +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}\$"; then
  log "ERROR: Container '${CONTAINER_NAME}' is not running."
  exit 1
fi

log "Checking database '${DATABASE_NAME}' inside container '${CONTAINER_NAME}'..."

DB_EXISTS="$(docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -tAc \
  "SELECT 1 FROM pg_database WHERE datname='${DATABASE_NAME}'" || true)"

if [[ "${DB_EXISTS}" != "1" ]]; then
  log "Database '${DATABASE_NAME}' not found. Creating..."
  docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -c \
    "CREATE DATABASE ${DATABASE_NAME};"
  log "Database '${DATABASE_NAME}' created successfully."
else
  log "Database '${DATABASE_NAME}' already exists."
fi

log "Verifying database is accepting connections..."
docker exec "${CONTAINER_NAME}" pg_isready -U "${POSTGRES_USER}" -d "${DATABASE_NAME}"

log "Checking if database is in recovery mode..."
IN_RECOVERY="$(docker exec "${CONTAINER_NAME}" psql -U "${POSTGRES_USER}" -d "${DATABASE_NAME}" -tAc \
  'SELECT pg_is_in_recovery();')"

if [[ "${IN_RECOVERY}" == "t" ]]; then
  log "WARNING: Database is currently in recovery mode."
else
  log "Database is not in recovery mode."
fi

log "Protect database check completed."


