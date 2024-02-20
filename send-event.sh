#!/bin/bash

# Check if the correct number of arguments are provided
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <message_type> <message> [key1=value1 key2=value2 ...]"
    exit 1
fi

# Extract message type and message from arguments
message_type=$1
message=$2

# Extract key-value pairs for JSON object
shift 2
json_data=""
for arg in "$@"; do
    key=$(echo "$arg" | cut -d'=' -f1)
    value=$(echo "$arg" | cut -d'=' -f2)
    json_data="$json_data,\"$key\":\"$value\""
done

# Remove leading comma and add curly braces to form valid JSON
json_data="{${json_data#,}}"

# Insert data into the event table
psql -U retrostar -d retrostar -c "INSERT INTO event (type, message, data) VALUES ('$message_type', '$message', '$json_data');"
