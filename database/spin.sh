#!/usr/bin/env bash
set +x
host=${1:-localhost}
user=${2:-postgres}
pw=${3:-}
db=${4:-adventurelibrary_dev}
echo "user: $user"
PGPASSWORD=$pw psql -h $host -f drop.sql -U $user $db
PGPASSWORD=$pw psql -h $host -f create.sql -U $user $db
PGPASSWORD=$pw psql -h $host -f seed.sql -U $user $db
$SHELL
