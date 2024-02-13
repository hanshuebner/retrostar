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

generate_random_string() {
    tr -dc ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 < /dev/urandom | head -c $1
}

install_key="$(generate_random_string 4)-$(generate_random_string 4)"

echo Generating key
openssl req -new -newkey rsa:2048 -nodes -keyout "$OUTPUT_KEY" -out "$OUTPUT_CSR" -subj "/CN=$client_name"
echo Generating cert
openssl ca -config "$CA_CONF" -batch -in "$OUTPUT_CSR" -out "$OUTPUT_CERT"
port=$(openssl x509 -in "$OUTPUT_CERT" -text -noout | perl -ne '/Serial Number: (\d+)/ && print $1')
echo Allocated UDP port $port
cat > "$OUTPUT_OVPN" <<EOF
client
remote retrostar.classic-computing.de $port
proto udp
dev tap
up "/etc/retrostar/if-up.sh"
down "/etc/retrostar/if-down.sh"
data-ciphers AES-256-GCM:AES-128-GCM:CHACHA20-POLY1305
cipher AES-256-GCM
key-direction 1
keepalive 5 15
script-security 2
<ca>
$(cat "$CA_CRT")
</ca>
<cert>
$(cat "$OUTPUT_CERT")
</cert>
<key>
$(cat "$OUTPUT_KEY")
</key>
<tls-auth>
$(cat "$TA_KEY")
</tls-auth>
EOF
rm "$OUTPUT_CSR"
echo "$OUTPUT_OVPN" created
cp "$OUTPUT_OVPN" /var/www/html/conf/
