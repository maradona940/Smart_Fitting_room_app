#!/bin/bash
echo "Testing Customer Checkout/Scan-Out Process"
echo "=========================================="
echo ""
echo "This script demonstrates how to check out a customer and scan out items."
echo ""
echo "1. First, get the list of items pending scan-out for a customer:"
echo ""
cat << 'INNER'
curl -X GET "http://localhost:4000/api/rooms/pending-scan-out?customerCardId=RFID-TEST-001" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
INNER
echo ""
echo "   This will show all items that need to be scanned out for this customer."
echo ""
echo ""
echo "2. Scan out the first item (replace TOKEN with your auth token):"
echo ""
cat << 'INNER'
curl -X POST http://localhost:4000/api/rooms/1/scan-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "productSku": "SKU-0001",
    "customerCardId": "RFID-TEST-001"
  }'
INNER
echo ""
echo ""
echo "3. Scan out the second item:"
echo ""
cat << 'INNER'
curl -X POST http://localhost:4000/api/rooms/1/scan-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "productSku": "SKU-0003",
    "customerCardId": "RFID-TEST-001"
  }'
INNER
echo ""
echo ""
echo "4. Scan out the third item:"
echo ""
cat << 'INNER'
curl -X POST http://localhost:4000/api/rooms/1/scan-out \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "productSku": "SKU-0005",
    "customerCardId": "RFID-TEST-001"
  }'
INNER
echo ""
echo ""
echo "5. After all items are scanned out, verify the room is available:"
echo ""
cat << 'INNER'
curl -X GET http://localhost:4000/api/rooms \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
INNER
echo ""
echo ""
echo "=========================================="
echo "Complete Checkout Workflow:"
echo "=========================================="
echo ""
echo "Step 1: Get pending items for customer"
echo "  GET /api/rooms/pending-scan-out?customerCardId=RFID-TEST-001"
echo ""
echo "Step 2: Scan out each item (repeat for each product)"
echo "  POST /api/rooms/:roomId/scan-out"
echo "  Body: { \"productSku\": \"SKU-XXXX\", \"customerCardId\": \"RFID-TEST-001\" }"
echo ""
echo "Step 3: System automatically:"
echo "  - Verifies customer card ID matches room assignment"
echo "  - Checks all items are scanned out"
echo "  - Runs anomaly detection"
echo "  - Sets room status to 'available' when complete"
echo ""
echo "=========================================="
echo "Security Features:"
echo "=========================================="
echo "- Customer card ID must match the room's assigned customer"
echo "- Products must belong to the customer's session"
echo "- Room door locks if items are missing"
echo "- System prevents exit until all items are scanned out"
echo ""
echo ""
echo "Or use the API from JavaScript:"
echo "  // Get pending items"
echo "  roomsAPI.getPendingScanOutItems('RFID-TEST-001')"
echo ""
echo "  // Scan out items (with customer card ID for security)"
echo "  roomsAPI.scanProductOut('1', 'SKU-0001', 'RFID-TEST-001')"
echo "  roomsAPI.scanProductOut('1', 'SKU-0003', 'RFID-TEST-001')"
echo "  roomsAPI.scanProductOut('1', 'SKU-0005', 'RFID-TEST-001')"
echo ""

