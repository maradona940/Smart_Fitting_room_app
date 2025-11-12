#!/bin/bash
echo "Testing Room Assignment Endpoint"
echo "================================"
echo ""
echo "1. First, let's check available rooms..."
echo ""
curl -X GET http://localhost:4000/api/rooms \
  -H "Authorization: Bearer $(node -e "const api = require('./lib/api.ts'); console.log('test')")" \
  || echo "Note: You'll need to login first to get a token"
echo ""
echo ""
echo "2. To test assignment, use this curl command (replace TOKEN with your auth token):"
echo ""
cat << 'INNER'
curl -X POST http://localhost:4000/api/rooms/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "customerCardId": "RFID-TEST-001",
    "productIds": ["SKU-0001", "SKU-0003", "SKU-0005"]
  }'
INNER
echo ""
echo "3. Or use the API from JavaScript:"
echo "   roomsAPI.assignRoomWithProducts('RFID-TEST-001', ['SKU-0001', 'SKU-0003', 'SKU-0005'])"
