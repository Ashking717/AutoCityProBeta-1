#!/usr/bin/env python3
# clean-all-duplicates.py

import sqlite3

db_path = '/Users/muhammedashiqk/AutoCityApp/backend/tally.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print('🔍 Checking all compatibility entries...\n')

# Show current state
cursor.execute("""
    SELECT ivc.id, si.item_name, vm.name as make, vmd.name as model, ivc.year_from, ivc.year_to
    FROM item_vehicle_compatibility ivc
    JOIN stock_items si ON ivc.item_id = si.id
    JOIN vehicle_makes vm ON ivc.make_id = vm.id
    LEFT JOIN vehicle_models vmd ON ivc.model_id = vmd.id
    ORDER BY si.item_name, vm.name, vmd.name
""")

print('📋 All current compatibility entries:')
for row in cursor.fetchall():
    id, item, make, model, year_from, year_to = row
    model_str = model if model else 'All Models'
    print(f'  ID {id}: {item} → {make} {model_str} ({year_from}-{year_to})')

print('\n' + '='*70)
print('🧹 Removing duplicates...\n')

# Find and remove duplicates, keeping only the FIRST occurrence
cursor.execute("""
    SELECT item_id, make_id, model_id, year_from, year_to, GROUP_CONCAT(id) as ids
    FROM item_vehicle_compatibility
    GROUP BY item_id, make_id, IFNULL(model_id, 0), IFNULL(year_from, 0), IFNULL(year_to, 0)
    HAVING COUNT(*) > 1
""")

total_deleted = 0
for row in cursor.fetchall():
    item_id, make_id, model_id, year_from, year_to, ids_str = row
    ids = [int(i) for i in ids_str.split(',')]
    
    # Get details for logging
    cursor.execute('SELECT item_name FROM stock_items WHERE id = ?', (item_id,))
    item_name = cursor.fetchone()[0]
    
    cursor.execute('SELECT name FROM vehicle_makes WHERE id = ?', (make_id,))
    make_name = cursor.fetchone()[0]
    
    model_name = 'All Models'
    if model_id:
        cursor.execute('SELECT name FROM vehicle_models WHERE id = ?', (model_id,))
        result = cursor.fetchone()
        if result:
            model_name = result[0]
    
    # Keep first, delete rest
    keep_id = ids[0]
    delete_ids = ids[1:]
    
    print(f'📦 {item_name} → {make_name} {model_name} ({year_from}-{year_to})')
    print(f'   Found {len(ids)} duplicates (IDs: {ids})')
    print(f'   ✓ Keeping ID {keep_id}')
    print(f'   ✗ Deleting IDs {delete_ids}\n')
    
    for del_id in delete_ids:
        cursor.execute('DELETE FROM item_vehicle_compatibility WHERE id = ?', (del_id,))
        total_deleted += 1

if total_deleted > 0:
    conn.commit()
    print(f'✅ Deleted {total_deleted} duplicate entries!\n')
else:
    print('✅ No duplicates found!\n')

print('='*70)
print('📊 Final compatibility summary:\n')

cursor.execute("""
    SELECT si.item_name, COUNT(ivc.id) as count
    FROM stock_items si
    LEFT JOIN item_vehicle_compatibility ivc ON si.id = ivc.item_id
    WHERE si.is_active = 1
    GROUP BY si.id
    ORDER BY si.item_name
""")

for item_name, count in cursor.fetchall():
    icon = '✓' if count > 0 else '○'
    print(f'  {icon} {item_name}: {count} entries')

conn.close()
print('\n🎉 Done! Refresh your app (Cmd+R) to see the changes.')