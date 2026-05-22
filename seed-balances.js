require('dotenv').config();
const { query } = require('./db/database');
const fs = require('fs');
const path = require('path');

async function seedBalances() {
  try {
    console.log('Setting all user balances to $200.00...');
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', 'seed_balances_200.sql'),
      'utf8'
    );
    const result = await query(sql);
    console.log(`Done. Rows updated: ${result.rowCount ?? 'unknown'}`);
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  }
}

seedBalances();
