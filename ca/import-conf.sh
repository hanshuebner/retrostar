#!/bin/bash

set -e

if [ -z "$1" ] || [ -z "$2" ]
then
    echo "usage: $0 <username> <openvpn-config>" 2>&1
    exit 1
fi

username=$1
openvpn_config=$2
config_content=$(<$openvpn_config)
config_content_escaped=$(printf '%s' "$config_content" | sed "s/'/''/g")
psql -d retrostar -c "SELECT insert_openvpn_configuration('$username', E'$config_content_escaped');"
