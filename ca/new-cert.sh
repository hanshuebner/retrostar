#!/bin/bash

set -e

if [ -z "$1" ]
then
    echo "usage: $0 <client-name>" 2>&1
    exit 1
fi

client_name=$1

trap "rm -f $client_name.*" ERR

CA_DIR="data"
OUTPUT_KEY="$CA_DIR/$client_name.key"
OUTPUT_CSR="$CA_DIR/$client_name.csr"
OUTPUT_CERT="$CA_DIR/$client_name.crt"
OUTPUT_OVPN="$CA_DIR/$client_name.ovpn"
CA_CONF=$(pwd)/ca.cnf
CA_KEY="$CA_DIR/ca.key"
CA_CRT="$CA_DIR/ca.crt"
CA_SERIAL="$CA_DIR/serial"
TA_KEY="$CA_DIR/ta.key"

echo Generating key
openssl req -new -newkey rsa:2048 -nodes -keyout "$OUTPUT_KEY" -out "$OUTPUT_CSR" -subj "/CN=$client_name"
echo Generating cert
openssl ca -config "$CA_CONF" -batch -in "$OUTPUT_CSR" -out "$OUTPUT_CERT" -notext
./import-cert.sh "$client_name" "$OUTPUT_CERT" "$OUTPUT_KEY"
rm "$OUTPUT_CSR"
