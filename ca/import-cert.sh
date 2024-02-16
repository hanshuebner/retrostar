#!/bin/bash

set -e

if [ -z "$1" ] || [ -z "$2" ]
then
    echo "usage: $0 <username> <cert-file> <key-file>" 2>&1
    exit 1
fi

SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

username=$1
cert_file=$2
key_file=$3
psql -tA -d retrostar -c "SELECT insert_openvpn_configuration('$username', E'$(<$cert_file)', E'$(<$key_file)');"
