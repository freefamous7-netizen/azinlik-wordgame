#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       🔤 Word Guessing Game - Expo Connection Info        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Expo is running
if pgrep -f "expo start" > /dev/null; then
    echo "✅ Expo server is RUNNING"
    echo ""
    
    # Get server info
    echo "📡 Server Information:"
    echo "   Local: http://localhost:8081"
    echo ""
    
    # Try to get tunnel URL from expo process
    echo "🌐 Tunnel URL:"
    echo "   Checking expo logs for tunnel URL..."
    if [ -f /tmp/expo_output.log ]; then
        TUNNEL_URL=$(grep -o "exp://[^[:space:]]*" /tmp/expo_output.log | head -1)
        if [ ! -z "$TUNNEL_URL" ]; then
            echo "   $TUNNEL_URL"
            echo ""
            echo "   📱 To connect with Expo Go:"
            echo "      1. Open Expo Go app on your phone"
            echo "      2. Tap 'Enter URL manually'"
            echo "      3. Enter: $TUNNEL_URL"
        else
            echo "   ⏳ Tunnel URL not ready yet. Wait a moment and run:"
            echo "      cat /tmp/expo_output.log | grep exp://"
        fi
    fi
    
    echo ""
    echo "🔧 Alternative Connection Methods:"
    echo ""
    echo "   Method 1: Using Local Network"
    echo "   --------------------------------"
    echo "   1. Get your computer's IP address"
    echo "   2. Update /app/mobile/.env with your IP:"
    echo "      EXPO_PUBLIC_BACKEND_URL=http://YOUR_IP:8001"
    echo "   3. Open Expo Go and connect to: exp://YOUR_IP:8081"
    echo ""
    echo "   Method 2: Using Expo Dev Client"
    echo "   --------------------------------"
    echo "   Visit: http://localhost:8081 in your browser"
    echo "   Scan the QR code with your phone's camera (iOS) or Expo Go (Android)"
    echo ""
    
else
    echo "❌ Expo server is NOT running"
    echo ""
    echo "To start the Expo server:"
    echo "   cd /app/mobile"
    echo "   npx expo start --tunnel"
fi

echo ""
echo "📊 Backend Status:"
if pgrep -f "uvicorn server:app" > /dev/null; then
    echo "   ✅ Backend is RUNNING on port 8001"
else
    echo "   ❌ Backend is NOT running"
fi

echo ""
echo "💾 Database Status:"
WORD_COUNT=$(mongosh --quiet --eval "db.words.countDocuments()" emergent_db 2>/dev/null || echo "Error")
if [ "$WORD_COUNT" != "Error" ]; then
    echo "   ✅ MongoDB is running"
    echo "   📚 Words in database: $WORD_COUNT"
else
    echo "   ❌ Cannot connect to MongoDB"
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
