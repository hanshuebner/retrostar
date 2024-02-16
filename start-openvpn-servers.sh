#!/bin/bash

set -e

SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

psql -d retrostar -tAF' ' -c 'select u.name, oc.port_number from openvpn_configuration oc join "user" u on u.id = oc.user_id' | while read -r username port
do
    pid_file="/var/run/openvpn/$username.pid"
    if [ -f "$pid_file" ] && [ -e "/proc/$(cat $pid_file)" ]
    then
        continue
    fi
    echo "starting server for $username"
    log_file="/var/log/openvpn/$username.log"
    sudo openvpn --cd "ca" \
            --daemon \
            --verb 3 \
            --port "$port" \
            --config openvpn_server.conf \
            --log-append $log_file \
            --writepid $pid_file
done
