#!/bin/bash

echo "=========================================="
echo "CryptoLedger Hard Reset Utility"
echo "=========================================="
echo

echo "WARNING: This will DESTROY all data in the database, clear Redis, and delete your .env configuration."
echo

read -p "Are you sure you want to proceed? (Y/N): " continue

if [[ ! "$continue" =~ ^[Yy]$ ]]; then
    echo "Reset cancelled."
    exit 0
fi

echo
echo "[1/4] Dropping and recreating PostgreSQL database..."
docker exec cryptoledger-postgres psql -U cryptoledger -d postgres -c "DROP DATABASE IF EXISTS cryptoledger_db WITH (FORCE);"
docker exec cryptoledger-postgres psql -U cryptoledger -d postgres -c "CREATE DATABASE cryptoledger_db;"

echo "[2/4] Schema Initialization skipped (handled by the Setup Wizard API)."

echo "[3/4] Flushing Redis..."
docker exec cryptoledger-redis redis-cli FLUSHALL

echo "[4/4] Removing backend/.env configuration..."
if [ -f backend/.env ]; then
    rm backend/.env
    echo "Deleted backend/.env"
else
    echo "backend/.env not found, skipping."
fi

echo
echo "=========================================="
echo "RESET COMPLETE."
echo "=========================================="
echo "Please clear your browser's Local Storage and Session Storage."
echo "You can now restart the backend to trigger the Onboarding Flow."