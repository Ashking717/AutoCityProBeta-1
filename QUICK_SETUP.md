# Quick Setup Guide - AutoCity Accounting Pro

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies

```bash
cd AutoCityApp
npm install
```

### Step 2: Run the Application

```bash
npm start
```

The application will:
- Start the Express server on port 5001
- Open the Electron desktop window
- Initialize the SQLite database
- Load sample car make/model data (first run only)

### Step 3: First Time Setup

When you first run the app:

1. **Create Your First Ledgers** (Go to Ledger section, press F2)
   ```
   Name: Cash in Hand
   Type: Asset
   Opening Balance: 10000
   ```
   
   ```
   Name: Sales Income
   Type: Income
   ```
   
   ```
   Name: Purchase Expense
   Type: Expense
   ```

2. **Add Categories** (Press F6)
   ```
   Name: Engine Parts
   Description: Parts related to engine
   ```
   
   ```
   Name: Brake Systems
   Parent: (none)
   ```

3. **Add Your First Stock Item** (Press F4)
   ```
   Item Name: Oil Filter
   Category: Engine Parts
   SKU: OF001
   Purchase Rate: 100
   Sale Rate: 150
   Current Qty: 50
   ```

4. **Add a Customer** (Press F7)
   ```
   Name: ABC Motors
   Phone: 9876543210
   Email: abc@example.com
   ```

5. **Make Your First Sale** (Press F5)
   - Select customer: ABC Motors
   - Search item: Oil Filter
   - Set quantity: 2
   - Complete sale

6. **View Reports** (Press F8)
   - Check Profit & Loss
   - View Sales Report
   - See Stock Report

## 🎯 Keyboard Shortcuts

| Key | Function |
|-----|----------|
| F1  | Dashboard |
| F2  | Ledger |
| F3  | Voucher |
| F4  | Stock |
| F5  | Sales/POS |
| F6  | Categories |
| F7  | Customers |
| F8  | Reports |
| F9  | Settings |

## 📁 Important Files

- **backend/tally.db** - Your database (BACKUP THIS!)
- **package.json** - Project configuration
- **main.js** - Electron main process
- **backend/server.js** - API server

## 🔧 Configuration

The app automatically:
- Creates database if not exists
- Sets up all tables
- Loads car makes/models (250+ makes)
- Initializes sample data

## 🎨 Understanding the Interface

### Dashboard (Home)
- Shows business summary
- Quick metrics
- Recent activity

### Ledger (Accounts)
Your "chart of accounts" - like different piggy banks:
- **Assets**: What you own (Cash, Bank, Stock)
- **Liabilities**: What you owe (Loans, Creditors)
- **Income**: Money earned (Sales, Interest)
- **Expenses**: Money spent (Purchases, Rent, Salary)

### Voucher (Transactions)
Record money movements:
- **Payment**: You pay someone
- **Receipt**: You receive payment
- **Sales**: Record a sale
- **Purchase**: Record a purchase

### Stock (Inventory)
Manage your products:
- Add items with SKU/Barcode
- Track quantities
- Set purchase/sale rates
- Link to car compatibility

### Sales/POS (Point of Sale)
Quick sale entry:
- Search products
- Add to cart
- Select customer
- Complete sale

### Categories
Organize products:
- Create hierarchical categories
- Parent-child relationships
- Track items per category

### Customers
Customer database:
- Contact information
- Purchase history
- Outstanding balances
- Credit limits

### Reports
Business insights:
1. Profit & Loss - How much profit?
2. Balance Sheet - Financial position
3. Sales Report - Sales analysis
4. Purchase Report - Purchase trends
5. Stock Report - Inventory status
6. Customer Ledger - Who owes you?
7. Daybook - Daily transactions
8. Cash Flow - Money movement
9. Tax Report - Tax liability

## 💡 Pro Tips

1. **Enter daily**: Don't wait - enter transactions daily
2. **Use categories**: Organize stock well from start
3. **Backup weekly**: Copy `backend/tally.db` to safe place
4. **Check reports**: Review reports weekly
5. **Update customers**: Keep customer data current
6. **Set reorder levels**: Get low stock alerts

## 🐛 Troubleshooting

### App won't start
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
npm start
```

### Database error
```bash
# Restore from backup
cp backend/tally.db.backup backend/tally.db
```

### Port already in use
```bash
# Change port in backend/server.js
const PORT = process.env.PORT || 5002;  // Change 5001 to 5002
```

## 📚 Learn More

Read these files for detailed information:
- `LEDGER_VOUCHER_EXPLAINED.md` - Accounting basics explained simply
- `COMPLETE_DOCUMENTATION.md` - Full technical reference
- `FEATURES_SUMMARY.md` - All implemented features

## 🎓 Example Workflow

### Daily Operations:

**Morning**:
1. Open app (npm start)
2. Check Dashboard
3. Review low stock alerts

**During Day**:
1. Make sales (F5)
2. Record purchases when goods arrive
3. Add new customers as needed

**Evening**:
1. Check Daybook report
2. Review cash balance
3. Backup database

**Weekly**:
1. Run Profit & Loss report
2. Check stock levels
3. Review customer balances
4. Update reorder quantities

**Monthly**:
1. Generate all reports
2. Reconcile accounts
3. Plan purchases based on sales trends
4. Backup database to cloud/external drive

## 🎉 You're Ready!

The app is now ready to use. Start with small test entries, then migrate your real business data.

For help, refer to the documentation files included in the project.

Happy Accounting! 💼📊
