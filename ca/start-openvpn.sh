#!/bin/bash

sudo killall openvpn
sudo ifconfig br0 down
sudo brctl delbr br0

set -e

brctl addbr br0
brctl setfd br0 5
ifconfig br0 up

ebtables --flush
ebtables -A FORWARD --protocol arp -j DROP
ebtables -A FORWARD --protocol ipv4 -j DROP
ebtables -A FORWARD --protocol ipv6 -j DROP
sysctl -q -w net.ipv6.conf.br0.disable_ipv6=1

cat data/index.txt | while read status timestamp serial junk client_name
do
    client_name=${client_name/\/CN=/}
    if [[ $status = V && $client_name != server ]]
    then
        echo "$client_name -> port $(( 16#$serial ))"
        openvpn --cd $PWD --daemon --verb 3 --port $(( 16#$serial )) --config openvpn_server.conf --log-append /var/log/openvpn/$client_name.log
    fi
done
