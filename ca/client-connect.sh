#!/bin/bash

# Dieses Skript läuft, wenn ein Client sich mit dem Server verbindet

mkdir -p /var/run/retrostar/clients
echo $common_name > /var/run/retrostar/clients/$dev

../send-event.sh openvpn-connect "Die VPN-Verbindung zu $common_name wurde hergestellt" user=$common_name dev=$dev
