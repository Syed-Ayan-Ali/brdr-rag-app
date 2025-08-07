import { prisma } from '../lib/prisma';
import { logEnvironmentStatus } from '../lib/env';

async function createTables() {
  console.log('🗄️ Creating Enhanced ETL Tables');
  console.log('================================');
  
  // Log environment status
  logEnvironmentStatus();

  try {
    console.log('🔧 Creating enhanced tables...');
    
    // Test database connection first
    console.log('1. Testing database connection...');
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful!');
    } catch (error) {
      console.log('❌ Database connection failed:', error);
      return;
    }

    // Create tables using Prisma client
    const tables = [
      {
        name: 'keywords',
        description: 'Keywords and concepts table',
        createFunction: async () => {
          try {
            await prisma.keywords.findFirst();
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'chunk_relationships',
        description: 'Chunk relationships table',
        createFunction: async () => {
          try {
            await prisma.chunk_relationships.findFirst();
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'keyword_relationships',
        description: 'Keyword relationships table',
        createFunction: async () => {
          try {
            await prisma.keyword_relationships.findFirst();
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'document_keywords',
        description: 'Document-keyword mappings table',
        createFunction: async () => {
          try {
            await prisma.document_keywords.findFirst();
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'chunk_keywords',
        description: 'Chunk-keyword mappings table',
        createFunction: async () => {
          try {
            await prisma.chunk_keywords.findFirst();
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'document_metadata',
        description: 'Enhanced document metadata table',
        createFunction: async () => {
          try {
            await prisma.document_metadata.findFirst();
            return true;
          } catch {
            return false;
          }
        }
      },
      {
        name: 'image_content',
        description: 'Image content table',
        createFunction: async () => {
          try {
            await prisma.image_content.findFirst();
            return true;
          } catch {
            return false;
          }
        }
      }
    ];

    console.log('\n2. Checking existing tables...');
    let existingTables = 0;
    let missingTables = 0;

    for (const table of tables) {
      try {
        const exists = await table.createFunction();
        if (exists) {
          console.log(`   ✅ Table '${table.name}' exists`);
          existingTables++;
        } else {
          console.log(`   ❌ Table '${table.name}' missing`);
          missingTables++;
        }
      } catch (error) {
        console.log(`   ❌ Table '${table.name}' missing`);
        missingTables++;
      }
    }

    console.log('');
    console.log('📊 Table Status:');
    console.log(`   ✅ Existing: ${existingTables}`);
    console.log(`   ❌ Missing: ${missingTables}`);

    if (missingTables > 0) {
      console.log('');
      console.log('⚠️ Some tables are missing. You need to run the migration.');
      console.log('');
      console.log('🔧 Migration Options:');
      console.log('1. Use Prisma (Recommended):');
      console.log('   - Run: npm run db:migrate:prisma');
      console.log('   - This will handle permissions properly');
      console.log('');
      console.log('2. Use Supabase Dashboard:');
      console.log('   - Go to your Supabase project dashboard');
      console.log('   - Navigate to SQL Editor');
      console.log('   - Copy and paste the contents of lib/etl/database/migration.sql');
      console.log('   - Execute the SQL');
      console.log('');
      console.log('3. Use Prisma Studio:');
      console.log('   - Run: npm run prisma:studio');
      console.log('   - This opens a web interface to manage your database');
    } else {
      console.log('');
      console.log('🎉 All enhanced tables exist!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run: npm run db:test');
      console.log('2. Run: npm run etl:example');
    }

  } catch (error) {
    console.error('❌ Table creation check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the table creation check
createTables().catch(console.error); 