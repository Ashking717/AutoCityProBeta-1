// import-car-data.js - Import car makes and models into database
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Load the car data
const carData = JSON.parse(fs.readFileSync('car-makes-models.json', 'utf8'));

// Connect to database
const dbPath = path.join(__dirname, 'backend', 'tally.db');
const db = new Database(dbPath);

console.log('🚗 Starting car data import...\n');

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS car_makes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    country TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS car_models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    make_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (make_id) REFERENCES car_makes(id),
    UNIQUE(make_id, name)
  );
`);

console.log('✅ Tables created/verified\n');

// Prepare statements
const insertMake = db.prepare(`
  INSERT OR IGNORE INTO car_makes (name, country) 
  VALUES (?, ?)
`);

const getMakeId = db.prepare(`
  SELECT id FROM car_makes WHERE name = ?
`);

const insertModel = db.prepare(`
  INSERT OR IGNORE INTO car_models (make_id, name) 
  VALUES (?, ?)
`);

// Import data
const transaction = db.transaction(() => {
  let makesInserted = 0;
  let modelsInserted = 0;

  carData.makes.forEach((make) => {
    // Insert make
    const makeResult = insertMake.run(make.name, make.country);
    if (makeResult.changes > 0) makesInserted++;

    // Get make ID
    const makeId = getMakeId.get(make.name).id;

    // Insert models
    make.models.forEach((modelName) => {
      const modelResult = insertModel.run(makeId, modelName);
      if (modelResult.changes > 0) modelsInserted++;
    });

    console.log(`✓ ${make.name}: ${make.models.length} models`);
  });

  console.log(`\n📊 Import Summary:`);
  console.log(`   Makes imported: ${makesInserted}`);
  console.log(`   Models imported: ${modelsInserted}`);
});

// Execute transaction
transaction();

// Verify import
const makeCount = db.prepare('SELECT COUNT(*) as count FROM car_makes').get();
const modelCount = db.prepare('SELECT COUNT(*) as count FROM car_models').get();

console.log(`\n✅ Database totals:`);
console.log(`   Total makes: ${makeCount.count}`);
console.log(`   Total models: ${modelCount.count}`);

// Show some examples
console.log(`\n📋 Sample data:`);
const samples = db.prepare(`
  SELECT cm.name as make, 
         GROUP_CONCAT(cmo.name, ', ') as models
  FROM car_makes cm
  LEFT JOIN car_models cmo ON cm.id = cmo.make_id
  GROUP BY cm.id
  LIMIT 5
`).all();

samples.forEach((sample, i) => {
  console.log(`   ${i + 1}. ${sample.make}: ${sample.models.substring(0, 60)}...`);
});

db.close();

console.log('\n🎉 Car data import completed successfully!\n');