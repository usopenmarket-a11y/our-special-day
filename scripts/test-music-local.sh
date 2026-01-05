#!/bin/bash
# Test script that starts dev server and runs tests

echo "🚀 Starting dev server..."
npm run dev &
DEV_PID=$!

echo "⏳ Waiting for server to start..."
sleep 10

echo "🧪 Running tests..."
npm run test-music-tab-visibility

echo "🛑 Stopping dev server..."
kill $DEV_PID 2>/dev/null


