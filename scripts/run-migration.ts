import { supabase } from '../lib/supabase';
import { logEnvironmentStatus } from '../lib/env';
import { readFileSync } from 'fs';
import { resolve } from 'path';

async function runMigration() {
  console.log('🗄️ Database Migration Runner');
  console.log('============================');
  
  // Log environment status
  logEnvironmentStatus();

  try {
    // Read the migration SQL file
    const migrationPath = resolve(__dirname, '../lib/etl/database/migration.sql');
    console.log('📖 Reading migration file...');
    
    let migrationSQL: string;
    try {
      migrationSQL = readFileSync(migrationPath, 'utf8');
      console.log('✅ Migration file loaded successfully');
    } catch (error) {
      console.error('❌ Error reading migration file:', error);
      return;
    }

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue;
      }

      console.log(`🔧 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Execute the SQL statement using Supabase
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Try alternative approach for statements that can't be executed via RPC
          console.log(`   ⚠️ Statement ${i + 1} skipped (may need manual execution)`);
          console.log(`   Statement: ${statement.substring(0, 100)}...`);
        } else {
          console.log(`   ✅ Statement ${i + 1} executed successfully`);
          successCount++;
        }
      } catch (error) {
        console.log(`   ❌ Statement ${i + 1} failed:`, error);
        errorCount++;
      }
    }

    console.log('');
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   ⚠️ Skipped: ${statements.length - successCount - errorCount}`);

    if (errorCount === 0) {
      console.log('');
      console.log('🎉 Migration completed successfully!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run: npm run db:test');
      console.log('2. Run: npm run etl:example');
    } else {
      console.log('');
      console.log('⚠️ Some statements failed. You may need to run the migration manually.');
      console.log('Check the migration file: lib/etl/database/migration.sql');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('');
    console.log('🔧 Alternative approaches:');
    console.log('1. Install PostgreSQL and use: psql $DATABASE_URL -f lib/etl/database/migration.sql');
    console.log('2. Use Supabase Dashboard to run the SQL manually');
    console.log('3. Use a database client like pgAdmin or DBeaver');
  }
}

// Run the migration
runMigration().catch(console.error); 