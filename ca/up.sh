#!/bin/bash

PATH=/usr/bin:/usr/sbin

tap=$1

brctl addif br0 $tap
ifconfig $tap up
