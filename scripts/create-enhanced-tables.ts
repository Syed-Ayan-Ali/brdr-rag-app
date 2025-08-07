import { prisma } from '../lib/prisma';
import { logEnvironmentStatus } from '../lib/env';

async function createEnhancedTables() {
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

    // Create enhanced tables using raw SQL
    console.log('\n2. Creating enhanced tables...');
    
    const tables = [
      {
        name: 'keywords',
        sql: `
          CREATE TABLE IF NOT EXISTS keywords (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            keyword TEXT UNIQUE NOT NULL,
            concept TEXT,
            weight FLOAT DEFAULT 1.0,
            frequency INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'chunk_relationships',
        sql: `
          CREATE TABLE IF NOT EXISTS chunk_relationships (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            source_chunk_id UUID NOT NULL REFERENCES brdr_documents_data(id) ON DELETE CASCADE,
            target_chunk_id UUID NOT NULL REFERENCES brdr_documents_data(id) ON DELETE CASCADE,
            relationship_type TEXT NOT NULL,
            weight FLOAT DEFAULT 1.0,
            metadata JSONB,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(source_chunk_id, target_chunk_id, relationship_type)
          );
        `
      },
      {
        name: 'keyword_relationships',
        sql: `
          CREATE TABLE IF NOT EXISTS keyword_relationships (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            source_keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
            target_keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
            relationship_type TEXT NOT NULL,
            weight FLOAT DEFAULT 1.0,
            co_occurrence INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(source_keyword_id, target_keyword_id, relationship_type)
          );
        `
      },
      {
        name: 'document_keywords',
        sql: `
          CREATE TABLE IF NOT EXISTS document_keywords (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            document_id UUID NOT NULL REFERENCES brdr_documents(id) ON DELETE CASCADE,
            keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
            frequency INTEGER DEFAULT 1,
            weight FLOAT DEFAULT 1.0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(document_id, keyword_id)
          );
        `
      },
      {
        name: 'chunk_keywords',
        sql: `
          CREATE TABLE IF NOT EXISTS chunk_keywords (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            chunk_id UUID NOT NULL REFERENCES brdr_documents_data(id) ON DELETE CASCADE,
            keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
            frequency INTEGER DEFAULT 1,
            weight FLOAT DEFAULT 1.0,
            position INTEGER,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(chunk_id, keyword_id)
          );
        `
      },
      {
        name: 'document_metadata',
        sql: `
          CREATE TABLE IF NOT EXISTS document_metadata (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            document_id UUID NOT NULL REFERENCES brdr_documents(id) ON DELETE CASCADE,
            metadata_type TEXT NOT NULL,
            metadata_key TEXT NOT NULL,
            metadata_value JSONB NOT NULL,
            confidence FLOAT DEFAULT 1.0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(document_id, metadata_type, metadata_key)
          );
        `
      },
      {
        name: 'image_content',
        sql: `
          CREATE TABLE IF NOT EXISTS image_content (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            document_id UUID NOT NULL REFERENCES brdr_documents(id) ON DELETE CASCADE,
            chunk_id UUID REFERENCES brdr_documents_data(id) ON DELETE SET NULL,
            image_url TEXT,
            image_data TEXT,
            ocr_text TEXT,
            image_type TEXT,
            position JSONB,
            related_text TEXT,
            embedding vector(384),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      }
    ];

    let createdTables = 0;
    let existingTables = 0;

    for (const table of tables) {
      try {
        console.log(`   Creating table '${table.name}'...`);
        
        // Use Prisma's $executeRaw to run the SQL
        await prisma.$executeRawUnsafe(table.sql);
        
        console.log(`   ✅ Table '${table.name}' created successfully`);
        createdTables++;
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️ Table '${table.name}' already exists`);
          existingTables++;
        } else {
          console.log(`   ❌ Error creating table '${table.name}':`, error.message);
        }
      }
    }

    console.log('');
    console.log('📊 Table Creation Summary:');
    console.log(`   ✅ Created: ${createdTables}`);
    console.log(`   ⚠️ Existing: ${existingTables}`);
    console.log(`   ❌ Failed: ${tables.length - createdTables - existingTables}`);

    if (createdTables > 0 || existingTables === tables.length) {
      console.log('');
      console.log('🎉 Enhanced tables are ready!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Run: npm run db:test');
      console.log('2. Run: npm run etl:example');
    } else {
      console.log('');
      console.log('⚠️ Some tables failed to create.');
      console.log('You may need to run the migration manually via Supabase Dashboard.');
    }

  } catch (error) {
    console.error('❌ Table creation failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the table creation
createEnhancedTables().catch(console.error); 