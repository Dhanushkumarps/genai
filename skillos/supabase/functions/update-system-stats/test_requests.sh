#!/bin/bash

# Configuration
FUNCTION_URL="http://127.0.0.1:54321/functions/v1/update-system-stats"
ANON_KEY="YOUR_ANON_KEY_HERE"
ACCESS_TOKEN="YOUR_USER_ACCESS_TOKEN_HERE"

echo "1. Testing Unauthorized (expect 401)"
curl -i -X POST $FUNCTION_URL \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"cognitive_load": 50, "energy_level": 50}'

echo -e "\n\n2. Testing Manual Update (expect 200)"
curl -i -X POST $FUNCTION_URL \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cognitive_load": 45, "energy_level": 80}'

echo -e "\n\n3. Testing Auto-Calculation (expect 200)"
curl -i -X POST $FUNCTION_URL \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"calculate_auto": true}'

echo -e "\n\n4. Testing Invalid Input (expect 400)"
curl -i -X POST $FUNCTION_URL \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cognitive_load": 150, "energy_level": -10}'
