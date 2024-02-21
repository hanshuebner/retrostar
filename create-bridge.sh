#!/bin/bash

set -e

ip link add name br0 type bridge
ip link set dev br0 up

ebtables --flush
ebtables -A FORWARD --protocol arp -j DROP
ebtables -A FORWARD --protocol ipv4 -j DROP
ebtables -A FORWARD --protocol ipv6 -j DROP
ebtables -A INPUT --protocol arp -j DROP
ebtables -A INPUT --protocol ipv4 -j DROP
ebtables -A INPUT --protocol ipv6 -j DROP
