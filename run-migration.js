require('dotenv').config();
const { query } = require('./db/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running database migration...');
    console.log('📍 Database URL:', process.env.DATABASE_URL ? 'Loaded from .env' : 'NOT FOUND');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'add_fcm_token.sql'),
      'utf8'
    );
    
    console.log('📄 Migration SQL loaded');
    
    await query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('   - Added fcm_token column to users table');
    console.log('   - Added index on fcm_token');
    console.log('   - Added updated_at column and trigger');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

runMigration();
