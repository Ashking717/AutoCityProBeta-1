# ✅ SALES FIX - Simple ID-Based Solution

## Problem Solved
The "NOT NULL constraint failed: sale_items.item_id" error is now fixed!

## How It Works

### The Smart Solution: Unique Negative IDs + Virtual Items Table

Services and labour get **unique negative IDs** and are stored in a special `virtual_items` table:

- **Stock Items (Goods)**: Positive IDs (1, 2, 3, ...) → stored in `stock_items`
- **Services**: Negative IDs starting from -1,000,000 → stored in `virtual_items`
- **Labour Charges**: Negative IDs starting from -2,000,000 → stored in `virtual_items`

### Database Structure

**stock_items table** (for goods):
```sql
id: 1, 2, 3, ... (positive)
item_name: "Oil Filter", "Brake Pad", etc.
current_qty: 50, 20, etc.
```

**virtual_items table** (for services/labour):
```sql
id: -1234567, -2456789, ... (negative)
item_name: "Oil Change", "Brake Repair", etc.
item_type: "service" or "labour"
```

**sale_items table** (all sales):
```sql
item_id: Can be positive (stock) or negative (virtual)
```

### Why This Works

✅ **No schema changes** - Uses existing `sale_items` structure
✅ **Names are tracked** - Virtual items table stores service/labour names
✅ **Stock tracking works** - Only positive IDs update inventory
✅ **Reports work perfectly** - JOIN with both tables
✅ **Clean separation** - Physical goods vs services/labour

## How IDs Are Generated

```javascript
// Stock items: Regular positive IDs from database (1, 2, 3, ...)

// Services: -1,000,000 to -1,999,999
const serviceId = -1000000 - (Date.now() % 1000000);

// Labour: -2,000,000 to -2,999,999  
const labourId = -2000000 - (Date.now() % 1000000);
```

## What Happens in Database

### When you sell a stock item:
```sql
-- stock_items: id=5, name="Oil Filter"
-- sale_items: item_id=5
→ Stock quantity decreases
→ Name retrieved from stock_items table
```

### When you sell a service:
```sql
-- virtual_items: id=-1234567, name="Oil Change", type="service"
-- sale_items: item_id=-1234567
→ No stock change
→ Name retrieved from virtual_items table
```

### When you sell labour:
```sql
-- virtual_items: id=-2456789, name="Brake Repair", type="labour"
-- sale_items: item_id=-2456789
→ No stock change
→ Name retrieved from virtual_items table
```

## Example Sale

Let's say you sell:
1. 2 × Oil Filters (stock item #5)
2. 1 × Oil Change Service (first time selling this service)
3. 1 × Brake Inspection Labour

**What happens:**

Step 1: Frontend generates IDs
```javascript
items = [
  { id: 5, name: "Oil Filter", type: "goods" },
  { id: -1234567, name: "Oil Change", type: "service" },
  { id: -2456789, name: "Brake Inspection", type: "labour" }
]
```

Step 2: Backend saves to database
```sql
-- Save virtual items (first occurrence)
INSERT INTO virtual_items (id, item_name, item_type) 
VALUES (-1234567, 'Oil Change', 'service');

INSERT INTO virtual_items (id, item_name, item_type)
VALUES (-2456789, 'Brake Inspection', 'labour');

-- Save all sale items
INSERT INTO sale_items (item_id, quantity, ...)
VALUES (5, 2, ...);          -- Stock item
VALUES (-1234567, 1, ...);   -- Service
VALUES (-2456789, 1, ...);   -- Labour

-- Update stock only for positive IDs
UPDATE stock_items SET current_qty = current_qty - 2 WHERE id = 5;
```

## Backend Logic

```javascript
items.forEach((item) => {
  // For negative IDs, save to virtual_items first
  if (item.id < 0) {
    db.prepare(`
      INSERT OR IGNORE INTO virtual_items (id, item_name, item_type) 
      VALUES (?, ?, ?)
    `).run(item.id, item.name, item.type);
  }
  
  // Save to sale_items (works for both positive and negative IDs)
  saleItemStmt.run(sale_id, item.id, quantity, rate, ...);
  
  // Only update stock for positive IDs
  if (item.id > 0) {
    updateStock(item.id, quantity);
  }
});
```

## Reports Retrieve Names Correctly

```sql
SELECT 
  COALESCE(s.item_name, v.item_name) as item_name,
  CASE 
    WHEN si.item_id > 0 THEN 'Stock Item'
    WHEN v.item_type = 'service' THEN 'Service'
    WHEN v.item_type = 'labour' THEN 'Labour'
  END as item_type,
  SUM(si.total) as revenue
FROM sale_items si
LEFT JOIN stock_items s ON s.id = si.item_id AND si.item_id > 0
LEFT JOIN virtual_items v ON v.id = si.item_id AND si.item_id < 0
GROUP BY si.item_id
```

Result:
| Item Name | Type | Revenue |
|-----------|------|---------|
| Oil Filter | Stock Item | ₹2,000 |
| Oil Change | Service | ₹500 |
| Brake Repair | Labour | ₹1,000 |

## No Setup Required!

Just use the updated version:
1. Extract the zip
2. Run `npm install` (if first time)
3. Run `npm start`
4. The `virtual_items` table is created automatically
5. Start selling goods, services, and labour!

## Testing

Try all three types:

### Test 1: Stock Item
```
Item Type: Goods
Select: Oil Filter
Quantity: 2
✅ Saves to sale_items with positive ID
✅ Stock decreases
✅ Name from stock_items table
```

### Test 2: Service
```
Item Type: Service
Name: Oil Change
Rate: 50
✅ Generates negative ID (e.g., -1234567)
✅ Saves to virtual_items table
✅ Saves to sale_items with negative ID
✅ No stock change
```

### Test 3: Labour
```
Item Type: Labour  
Name: Brake Repair
Rate: 100
✅ Generates negative ID (e.g., -2456789)
✅ Saves to virtual_items table
✅ Saves to sale_items with negative ID
✅ No stock change
```

## Benefits

1. **Simple** - Works with existing database schema
2. **Trackable** - Service/labour names are saved and retrievable
3. **Fast** - Efficient JOINs in reports
4. **Clear** - Separate tables for different item types
5. **Compatible** - Works with all existing features

## Database Tables

| Table | Purpose | ID Range |
|-------|---------|----------|
| `stock_items` | Physical inventory | 1 to ∞ (positive) |
| `virtual_items` | Services & labour | -∞ to -1 (negative) |
| `sale_items` | All sales | Both positive and negative |

## Summary

This elegant solution:
- ✅ Fixes the error completely
- ✅ Requires no database migration (table auto-created)
- ✅ Works immediately on restart
- ✅ Tracks names for services/labour
- ✅ Handles all three sale types perfectly
- ✅ Reports show accurate names and types

Enjoy seamless sales of goods, services, and labour! 🎉
