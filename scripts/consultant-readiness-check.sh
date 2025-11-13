#!/bin/bash
# Consultant Readiness Check Script

echo "🔍 WCAG AI Platform - Keyword Feature Testing"
echo "=============================================="
echo

# Check if server is running
echo "1. Server Status Check..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ API server is running"
else
    echo "❌ API server is not running - start with 'npm run dev' in packages/api/"
    exit 1
fi

echo

# Test keyword aggregation endpoint
echo "2. Testing keyword aggregation..."
KEYWORDS_RESPONSE=$(curl -s http://localhost:3001/api/keywords)
if [[ $? -eq 0 && "$KEYWORDS_RESPONSE" != "" ]]; then
    echo "✅ GET /api/keywords works"
    echo "   Sample response: $(echo $KEYWORDS_RESPONSE | cut -c1-100)..."
else
    echo "❌ GET /api/keywords failed"
fi

echo

# Test draft listing with keyword filter
echo "3. Testing draft filtering by keywords..."
DRAFTS_RESPONSE=$(curl -s "http://localhost:3001/api/drafts?keyword=accessibility")
if [[ $? -eq 0 && "$DRAFTS_RESPONSE" != "" ]]; then
    echo "✅ GET /api/drafts?keyword=accessibility works"
else
    echo "❌ Keyword filtering failed"
fi

echo

# Test draft creation with automatic keyword extraction
echo "4. Testing draft creation with keyword extraction..."
CREATE_RESPONSE=$(curl -s -X POST http://localhost:3001/api/drafts \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "test@example.com",
    "subject": "Accessibility Testing Critical Contrast Issues",
    "body": "Found color contrast violations requiring immediate attention for WCAG AA compliance",
    "violations": []
  }')

if [[ $? -eq 0 && "$CREATE_RESPONSE" =~ "success" ]]; then
    echo "✅ POST /api/drafts with keyword extraction works"
    echo "   Keywords should be automatically extracted from subject and body"
else
    echo "❌ Draft creation with keyword extraction failed"
fi

echo

# Test keyword refresh endpoint
echo "5. Testing keyword refresh..."
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:3001/api/keywords/refresh)
if [[ $? -eq 0 && "$REFRESH_RESPONSE" =~ "success" ]]; then
    echo "✅ POST /api/keywords/refresh works"
else
    echo "❌ Keyword refresh failed"
fi

echo
echo "🎉 Keyword Feature Testing Complete!"
echo
echo "Next steps:"
echo "- Open webapp (npm run dev in packages/webapp)"
echo "- Test keyword filtering in dashboard UI"
echo "- Verify keyword badges display on draft cards"
echo "- Test creating new drafts and seeing extracted keywords"