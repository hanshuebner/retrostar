#!/bin/bash

set -e

CA_CONF=$(pwd)/ca.cnf

if [ -z "$1" ]
then
    echo "usage: $0 <client-name>" 2>&1
    exit 1
fi

client_name=$1

openssl ca -config "$CA_CONF" -revoke data/$client_name.crt -crl_reason superseded
openssl ca -config "$CA_CONF" -gencrl -out data/crl.pem -crldays 3650
