#!/bin/bash

set -e

export PGDATABASE=retrostar

if [ -z "$1" ]; then
  echo "Usage: $0 <username>"
  exit 1
fi

username=$1

SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

# Create user
psql -tA -c 'INSERT INTO "user" (name) VALUES ('"'$username'"')'
./ca/new-cert.sh $username
./start-openvpn-servers.sh
psql -tA -c "SELECT 'https://retrostar.classic-computing.de/set-password?key=' || request_password_reset('$username');"
