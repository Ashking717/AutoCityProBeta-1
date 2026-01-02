#!/bin/bash

# Database Cleanup Script - Start Fresh
# This removes test data and creates a clean database

echo "🧹 Auto City Accounting - Database Cleanup"
echo "=========================================="
echo ""

# Check if in correct directory
if [ ! -f "backend/tally.db" ]; then
    echo "❌ Error: backend/tally.db not found!"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Backup existing database
BACKUP_FILE="backend/tally.db.backup-$(date +%Y%m%d-%H%M%S)"
echo "📦 Creating backup: $BACKUP_FILE"
cp backend/tally.db "$BACKUP_FILE"

echo "✅ Backup created successfully"
echo ""

# Ask for confirmation
echo "⚠️  WARNING: This will delete ALL data including:"
echo "   - Sales records"
echo "   - Purchase records"
echo "   - Stock items"
echo "   - Customers"
echo "   - Ledgers (except default ones)"
echo "   - Vouchers"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo ""
    echo "❌ Cleanup cancelled"
    echo "Your data is safe!"
    exit 0
fi

echo ""
echo "🗑️  Deleting old database..."
rm backend/tally.db 2>/dev/null

echo "✅ Old database deleted"
echo ""
echo "🔄 Restarting application to create fresh database..."
echo ""
echo "The application will:"
echo "  1. Create new clean database"
echo "  2. Load car makes/models (50 makes, 1000+ models)"
echo "  3. Be ready for your data"
echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npm start"
echo "  2. The app will create a fresh database automatically"
echo "  3. Start using with clean data!"
echo ""
echo "💡 Your backup is saved as: $BACKUP_FILE"
echo "   You can restore it anytime by:"
echo "   cp $BACKUP_FILE backend/tally.db"
echo ""
