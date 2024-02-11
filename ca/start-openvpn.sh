#!/bin/bash

brctl addbr br0
brctl setfd br0 5
ifconfig br0 up

ebtables -A FORWARD -o br0 -p IPv4 -j DROP
ebtables -A FORWARD -o br0 -p IPv6 -j DROP
ebtables -A FORWARD -o br0 -p ARP -j DROP

set -e

cat data/index.txt | while read status timestamp serial junk client_name
do
    client_name=${client_name/\/CN=/}
    if [[ $status = V && $client_name != server ]]
    then
        echo $client_name
        echo openvpn --daemon --port $(( 16#$serial )) --config openvpn_server.conf --log-append /var/log/openvpn/$client_name.log
    fi
done
