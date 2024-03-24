#!/bin/bash

set -e

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ] || [ -z "$4" ]
then
    echo "usage: $0 <owner> <client-name> <cert-file> <key-file>" 2>&1
    exit 1
fi

SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

owner=$1
username=$2
cert_file=$3
key_file=$4
psql -tA -d retrostar -c "SELECT insert_openvpn_configuration('$username', '$owner', E'$(<$cert_file)', E'$(<$key_file)');"
