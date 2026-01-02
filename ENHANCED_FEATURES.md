# Enhanced Features Documentation

## Overview

This document describes the new features added to AutoCity Accounting Pro:

1. **Multi-user Support** - User roles and permissions
2. **Activity Logs** - Complete audit trail
3. **Advanced Analytics** - Profit trends and forecasting
4. **Barcode Scanner** - Quick stock entry and POS scanning

## Feature 1: Multi-user Support

### User Roles

#### Admin
- Full system access
- Can create/edit/delete users
- Can view all activity logs
- Can access all features
- Can reset passwords

#### Manager
- Can view analytics and reports
- Can manage inventory
- Can view activity logs
- Can create and edit sales
- Cannot manage users

#### Cashier
- Can create sales (POS)
- Can view dashboard
- Can view inventory (read-only)
- Limited report access
- Cannot access admin features

### Permissions System

The system uses a granular permission system:

- `view_dashboard` - Access dashboard
- `create_sales` - Process sales transactions
- `edit_sales` - Modify existing sales
- `delete_sales` - Delete sales records
- `view_inventory` - View stock items
- `manage_inventory` - Add/edit stock
- `adjust_stock` - Modify stock quantities
- `view_reports` - Access reports
- `export_reports` - Export data
- `view_analytics` - View trends
- `manage_users` - User management
- `view_activity_logs` - View audit trail
- `manage_settings` - System settings

### User Management Features

1. **Create Users**
   - Set username and password
   - Assign role
   - Set custom permissions
   - Set email and full name

2. **Edit Users**
   - Update user information
   - Change role
   - Modify permissions
   - Activate/deactivate accounts

3. **Reset Passwords**
   - Admin can reset any user password
   - Users can change their own password

4. **Session Management**
   - Secure session tokens
   - Auto logout on inactivity
   - Track login history
   - Multiple concurrent sessions support

### Authentication Flow

```
1. User enters credentials
2. Server validates username/password
3. Server creates session token
4. Token stored in localStorage
5. All API requests include token
6. Server validates token on each request
7. Session expires on logout
```

### Security Features

- Passwords hashed with SHA-256
- Session tokens are random 32-byte strings
- Sessions tracked in database
- Failed login attempts logged
- No plain text password storage

## Feature 2: Activity Logs

### What Gets Logged

Every action in the system is logged with:
- User ID and username
- Action type
- Entity type and ID
- Details/description
- IP address
- Timestamp

### Logged Actions

- LOGIN_SUCCESS / LOGIN_FAILED
- LOGOUT
- PASSWORD_CHANGED
- PASSWORD_RESET
- USER_CREATED / USER_UPDATED
- STOCK_ADDED / STOCK_UPDATED / STOCK_DELETED
- SALE_CREATED / SALE_UPDATED / SALE_DELETED
- BARCODE_SCAN / BARCODE_GENERATED
- VOUCHER_CREATED / VOUCHER_UPDATED
- And more...

### Activity Log Features

1. **View Logs**
   - Paginated view (100 records at a time)
   - Real-time updates
   - Search and filter capabilities

2. **Filter Options**
   - By user
   - By action type
   - By date range
   - By entity type

3. **Summary Dashboard**
   - Actions today
   - Actions this week
   - Active users count
   - Top 5 actions

4. **Export Logs**
   - Export to CSV
   - Export to Excel
   - Date range selection
   - Filter before export

### Use Cases

- **Audit Compliance**: Track who did what and when
- **Troubleshooting**: Identify when issues occurred
- **Performance Review**: Monitor employee activities
- **Security**: Detect unauthorized access attempts
- **Training**: Identify areas where users need help

## Feature 3: Advanced Analytics

### Profit Trends

**What it shows:**
- Total sales over time
- Total purchases over time
- Calculated profit (sales - purchases)
- Transaction counts

**Time periods:**
- Daily
- Weekly
- Monthly
- Yearly

**Visualization:**
- Line chart with three series
- Interactive tooltips
- Responsive design
- Export to image

### Sales Forecasting

**Method:**
- Simple moving average
- Based on last 3 months
- 3-month forecast

**Data shown:**
- Historical sales (12 months)
- Average transaction value
- Transaction count
- Predicted sales (next 3 months)
- Confidence level

**Visualization:**
- Combined line chart
- Historical data (solid line)
- Forecast data (dashed line)
- Color-coded confidence

### Customer Analytics

**Metrics:**
- Total customers
- New customers this month
- Top 10 customers by spending
- Customer growth over time

**Top Customers View:**
- Name and contact
- Total spent
- Purchase count
- Last purchase date
- Ranked list

**Customer Growth:**
- Monthly new customer count
- Bar chart visualization
- 12-month history
- Growth trends

### Analytics Dashboard Layout

```
┌─────────────────────────────────────────┐
│  Period Selector: [Day][Week][Month][Year]│
├─────────────────────────────────────────┤
│  ┌───────────────┐  ┌────────────────┐  │
│  │ Profit Trends │  │ Sales Forecast │  │
│  │   Chart       │  │   Chart        │  │
│  └───────────────┘  └────────────────┘  │
│  ┌───────────────┐  ┌────────────────┐  │
│  │ Top Customers │  │ Customer       │  │
│  │   List        │  │   Growth Chart │  │
│  └───────────────┘  └────────────────┘  │
└─────────────────────────────────────────┘
```

### Data Refresh

- Analytics calculated in real-time
- Daily snapshots stored for performance
- Historical data preserved
- Export capabilities for all charts

## Feature 4: Barcode Scanner

### Supported Hardware

- USB barcode scanners
- Bluetooth barcode scanners
- Wedge-style scanners
- Any HID-compliant scanner

### How It Works

1. Scanner acts as keyboard
2. Types barcode digits rapidly
3. Sends Enter key
4. App detects rapid input
5. Looks up item in database
6. Auto-adds to cart (in POS)

### Barcode Features

1. **Scan to Add**
   - In Sales/POS: Auto add to cart
   - In Stock: Show item details
   - Audio/visual feedback

2. **Generate Barcodes**
   - Auto-generate for items
   - EAN-13 format
   - Code 128 format
   - UPC format

3. **Barcode Management**
   - Assign to items
   - Update existing
   - Print labels
   - Bulk operations

### Barcode Format

Generated barcodes follow this pattern:
```
200 + (Item ID padded to 9 digits) + Check Digit
Example: 2000000012343
```

### Integration Points

**In Sales/POS:**
- Scan barcode
- Item added to cart automatically
- Quantity can be adjusted
- Price shown immediately

**In Stock Management:**
- Scan to view item
- Quick stock entry
- Fast searching
- Bulk updates

**In Inventory:**
- Scan to adjust quantity
- Quick stock take
- Verification scans
- Location tracking

### Scanner Setup

1. Connect barcode scanner (USB/Bluetooth)
2. Scanner should be in keyboard emulation mode
3. Test by scanning a barcode in any text field
4. App automatically detects and processes scans

### Best Practices

- Use consistent barcode format
- Print clear labels
- Test scanner before use
- Keep barcode database updated
- Regular database backups

## Database Schema Changes

### New Tables

```sql
-- Enhanced users table
users (
  id, username, password, full_name, email,
  role, permissions, is_active, last_login,
  created_at, created_by
)

-- Activity logs
activity_logs (
  id, user_id, username, action, entity_type,
  entity_id, details, ip_address, timestamp
)

-- User sessions
user_sessions (
  id, user_id, session_token, login_time,
  logout_time, last_activity, ip_address
)

-- Analytics snapshots
analytics_snapshots (
  id, snapshot_date, total_sales, total_purchases,
  profit, transactions_count, new_customers,
  stock_value, data_json, created_at
)
```

### Modified Tables

```sql
-- stock_items: Enhanced barcode field
-- sales: Added created_by field
-- vouchers: Added created_by field
-- stock_transactions: Added created_by field
```

## API Endpoints

### Authentication
- POST `/api/auth/login` - User login
- POST `/api/auth/logout` - User logout
- GET `/api/auth/me` - Get current user
- POST `/api/auth/change-password` - Change password

### User Management
- GET `/api/users` - List all users
- POST `/api/users` - Create user
- PUT `/api/users/:id` - Update user
- POST `/api/users/:id/reset-password` - Reset password

### Activity Logs
- GET `/api/activity-logs` - Get activity logs
- GET `/api/activity-logs/summary` - Get summary stats

### Analytics
- GET `/api/analytics/profit-trends` - Get profit data
- GET `/api/analytics/sales-forecast` - Get forecast
- GET `/api/analytics/customers` - Get customer analytics

### Barcode
- GET `/api/stock/barcode/:barcode` - Lookup by barcode
- POST `/api/stock/:id/generate-barcode` - Generate barcode

## Configuration

### Default Settings

```javascript
// Default admin credentials
Username: admin
Password: admin123
```

⚠️ **IMPORTANT:** Change the default admin password immediately after first login!

### Session Configuration

```javascript
// Session timeout: 24 hours of inactivity
// Token length: 64 characters
// Password hash: SHA-256
```

### Analytics Configuration

```javascript
// Snapshot frequency: Daily
// Forecast period: 3 months
// Historical data: 12 months
// Chart update: Real-time
```

## Offline Capabilities

All features work completely offline:

✅ User authentication (local database)
✅ Activity logging (local storage)
✅ Analytics (calculated from local data)
✅ Barcode scanning (USB/Bluetooth)
✅ Session management (localStorage)
✅ Data persistence (SQLite)

## Troubleshooting

### Login Issues

**Problem:** Cannot login
**Solution:** 
- Check username spelling
- Verify Caps Lock is off
- Use default admin credentials
- Check if user is active

### Scanner Issues

**Problem:** Barcode not detected
**Solution:**
- Check scanner connection
- Verify scanner in keyboard mode
- Test in text field first
- Check barcode format

### Analytics Issues

**Problem:** No data in charts
**Solution:**
- Create some test sales
- Wait for daily snapshot
- Check date filters
- Verify permissions

### Performance Issues

**Problem:** Slow loading
**Solution:**
- Limit activity log results
- Use date range filters
- Archive old data
- Optimize database

## Best Practices

1. **User Management**
   - Use strong passwords
   - Assign minimal required permissions
   - Regularly review user access
   - Deactivate instead of deleting

2. **Activity Logs**
   - Review logs regularly
   - Archive old logs monthly
   - Use filters to find specific actions
   - Export for long-term storage

3. **Analytics**
   - Review weekly trends
   - Use forecasts for planning
   - Track customer metrics
   - Monitor profit margins

4. **Barcode Scanner**
   - Test before going live
   - Print backup labels
   - Keep database synced
   - Train staff properly

## Security Considerations

1. **Passwords**
   - Minimum 6 characters
   - Change default passwords
   - Use unique passwords
   - No password sharing

2. **Sessions**
   - Auto-logout after inactivity
   - One session per user
   - Secure token storage
   - Clear on logout

3. **Permissions**
   - Principle of least privilege
   - Regular permission reviews
   - Role-based access
   - Audit trail

4. **Data**
   - Regular backups
   - Encrypted at rest
   - Access logging
   - Secure exports

## Support

For issues or questions:
1. Check this documentation
2. Review INTEGRATION_GUIDE.js
3. Check activity logs for errors
4. Contact system administrator

---

**Version:** 2.0
**Last Updated:** January 2026
**Author:** AutoCity Development Team
