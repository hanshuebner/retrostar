#!/bin/bash

# Dieses Skript läuft, wenn die Verbindung zur Bridge hergestellt wurde

PATH=/usr/sbin:/usr/bin

IF=$1

brctl addif br0 $IF
ifconfig $IF up
ip -6 addr flush $IF
