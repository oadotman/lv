#!/bin/bash
# =====================================================
# TEST RUNNER FOR CALLIQ
# Runs unit tests and reports results
# =====================================================

echo "🧪 Running CallIQ Tests..."
echo ""

# Run unit tests
echo "📦 Running Unit Tests..."
npm test -- --coverage --watchAll=false

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo ""
    echo "📊 Coverage Summary:"
    cat coverage/coverage-summary.json 2>/dev/null || echo "No coverage data"
    exit 0
else
    echo ""
    echo "❌ Some tests failed"
    echo "Review the output above for details"
    exit 1
fi
