#!/bin/bash

set -e

SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

psql -U retrostar -d retrostar -tAF' ' -c 'select coalesce(oc.config_name, u.name), oc.port_number from openvpn_configuration oc join "user" u on u.id = oc.user_id' | while read -r config_name port
do
    pid_file="/var/run/openvpn/$config_name.pid"
    if [ -f "$pid_file" ] && [ -e "/proc/$(cat $pid_file)" ]
    then
        continue
    fi
    echo "starting server for $config_name"
    log_file="/var/log/openvpn/$config_name.log"
    sudo openvpn --cd "ca" \
            --daemon \
            --verb 3 \
            --port "$port" \
            --config openvpn_server.conf \
            --log-append $log_file \
            --writepid $pid_file
done
