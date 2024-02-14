#!/bin/bash

set -e

psql -d retrostar -tAF' ' -c 'select u.name, oc.port_number from openvpn_configuration oc join "user" u on u.id = oc.user_id' | while read -r username port
do
    pid_file="/var/run/openvpn/$username.pid"
    if ! [ -f "$pid_file" -a -e "/proc/$(<$pid_file)" ]
    then
        continue
    fi
    echo openvpn --cd "$PWD" \
            --daemon \
            --verb 3 \
            --port "$port" \
            --config openvpn_server.conf \
            --log-append /var/log/openvpn/"$username".log \
            --writepid /var/run/openvpn/"$username".pid
done
