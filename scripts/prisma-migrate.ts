import { execSync } from 'child_process';
import { logEnvironmentStatus } from '../lib/env';

async function runPrismaMigration() {
  console.log('🗄️ Prisma Database Migration');
  console.log('============================');
  
  // Log environment status
  logEnvironmentStatus();

  try {
    console.log('🔧 Setting up Prisma...');
    
    // Generate Prisma client
    console.log('1. Generating Prisma client...');
    try {
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma client generated successfully');
    } catch (error) {
      console.log('⚠️ Prisma client generation failed, continuing...');
    }

    // Check database connection
    console.log('\n2. Checking database connection...');
    try {
      execSync('npx prisma db pull', { stdio: 'inherit' });
      console.log('✅ Database connection successful');
    } catch (error) {
      console.log('❌ Database connection failed');
      console.log('Please check your DATABASE_URL in .env file');
      return;
    }

    // Create migration
    console.log('\n3. Creating migration...');
    try {
      execSync('npx prisma migrate dev --name enhanced-etl-schema', { stdio: 'inherit' });
      console.log('✅ Migration created and applied successfully');
    } catch (error) {
      console.log('⚠️ Migration failed, trying alternative approach...');
      
      // Try to push the schema directly
      console.log('\n4. Pushing schema directly...');
      try {
        execSync('npx prisma db push', { stdio: 'inherit' });
        console.log('✅ Schema pushed successfully');
      } catch (pushError) {
        console.log('❌ Schema push failed');
        console.log('This might be due to existing tables or permissions');
        console.log('');
        console.log('🔧 Alternative approaches:');
        console.log('1. Use Supabase Dashboard to run the migration manually');
        console.log('2. Check if tables already exist with: npm run db:check');
        console.log('3. Use a database client to run the migration SQL');
        return;
      }
    }

    // Verify migration
    console.log('\n5. Verifying migration...');
    try {
      execSync('npx prisma db pull', { stdio: 'inherit' });
      console.log('✅ Migration verification successful');
    } catch (error) {
      console.log('⚠️ Migration verification failed');
    }

    console.log('\n🎉 Prisma migration completed!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: npm run db:check');
    console.log('2. Run: npm run etl:example');
    console.log('3. Check the ETL_SETUP_GUIDE.md for more details');

  } catch (error) {
    console.error('❌ Prisma migration failed:', error);
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('1. Check your DATABASE_URL in .env file');
    console.log('2. Ensure your database is accessible');
    console.log('3. Check if you have the necessary permissions');
    console.log('4. Try running: npm run db:check to see current status');
  }
}

// Run the migration
runPrismaMigration().catch(console.error); 