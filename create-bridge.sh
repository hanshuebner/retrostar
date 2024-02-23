#!/bin/bash

set -e

if ip link show br0 &> /dev/null; then
  echo br0 exists
  exit 0
fi

mkdir -p /var/run/retrostar/clients

ip link add name br0 type bridge
ip link set dev br0 up

ebtables --flush
ebtables -A FORWARD --protocol arp -j DROP
ebtables -A FORWARD --protocol ipv4 -j DROP
ebtables -A FORWARD --protocol ipv6 -j DROP
ebtables -A INPUT --protocol arp -j DROP
ebtables -A INPUT --protocol ipv4 -j DROP
ebtables -A INPUT --protocol ipv6 -j DROP
