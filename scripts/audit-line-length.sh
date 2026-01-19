#!/bin/bash

# Simple line length audit script
# Checks for lines longer than 100 characters in TypeScript files

echo "Auditing line length (max 100 characters)..."

LONG_LINES=$(find src tests -name "*.ts" -exec grep -l ".\{101\}" {} \; 2>/dev/null)

if [ -z "$LONG_LINES" ]; then
    echo "✅ All lines are within 100 character limit"
    exit 0
else
    echo "⚠️  Files with lines exceeding 100 characters:"
    echo "$LONG_LINES"
    echo "Consider refactoring long lines for better readability"
    exit 0  # Don't fail CI for this
fi