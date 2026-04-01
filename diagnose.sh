#!/bin/bash
# Backend Diagnostics - Run this to check if everything is configured correctly

echo "=== CodeTexa Backend Payment Configuration Diagnostics ==="
echo ""

# Check if .env file exists
if [ -f ".env" ]; then
    echo "✓ .env file found"
else
    echo "✗ .env file NOT found in backend directory"
    exit 1
fi

# Check for Razorpay credentials
if grep -q "RAZORPAY_KEY_ID" .env; then
    KEY_ID=$(grep "RAZORPAY_KEY_ID=" .env | cut -d '=' -f2)
    if [ "$KEY_ID" != "" ] && [ "$KEY_ID" != "your_actual_razorpay_key_id_here" ]; then
        echo "✓ RAZORPAY_KEY_ID is set: ${KEY_ID:0:20}..."
    else
        echo "✗ RAZORPAY_KEY_ID is empty or placeholder"
    fi
else
    echo "✗ RAZORPAY_KEY_ID not found in .env"
fi

if grep -q "RAZORPAY_KEY_SECRET" .env; then
    KEY_SECRET=$(grep "RAZORPAY_KEY_SECRET=" .env | cut -d '=' -f2)
    if [ "$KEY_SECRET" != "" ] && [ "$KEY_SECRET" != "your_actual_razorpay_key_secret_here" ]; then
        echo "✓ RAZORPAY_KEY_SECRET is set: ${KEY_SECRET:0:20}..."
    else
        echo "✗ RAZORPAY_KEY_SECRET is empty or placeholder"
    fi
else
    echo "✗ RAZORPAY_KEY_SECRET not found in .env"
fi

echo ""
echo "=== Checking Node Packages ==="

if [ -f "package.json" ]; then
    if grep -q "razorpay" package.json; then
        echo "✓ razorpay package is in package.json"
        
        if [ -d "node_modules/razorpay" ]; then
            echo "✓ razorpay is installed in node_modules"
        else
            echo "⚠ razorpay NOT installed. Run: npm install razorpay"
        fi
    else
        echo "✗ razorpay not in package.json. Run: npm install razorpay"
    fi
else
    echo "✗ package.json not found"
fi

echo ""
echo "=== MongoDB Connection ==="

if grep -q "MONGO_URI" .env; then
    MONGO=$(grep "MONGO_URI=" .env | cut -d '=' -f2)
    if [ "$MONGO" != "" ]; then
        echo "✓ MONGO_URI is configured"
    else
        echo "✗ MONGO_URI is empty"
    fi
else
    echo "✗ MONGO_URI not found in .env"
fi

echo ""
echo "=== Diagnostics Complete ==="
echo ""
echo "Next Steps:"
echo "1. If any items are ✗, fix them"
echo "2. Restart backend: npm run dev"
echo "3. Check console output for detailed logs"
echo "4. Try payment flow again"
