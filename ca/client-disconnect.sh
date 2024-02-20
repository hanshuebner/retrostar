#!/bin/bash

# Dieses Skript läuft, wenn eine Client-Verbindung endet

../send-event.sh openvpn-connect "Die VPN-Verbindung zu $common_name wurde beendet" user=$common_name
