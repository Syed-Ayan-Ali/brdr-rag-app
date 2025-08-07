import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateEnhancedSchema() {
  console.log('🔄 Starting enhanced schema migration...');
  
  try {
    // Create new tables and modify existing ones
    console.log('📋 Creating enhanced schema...');
    
    // Note: This would typically be done via Prisma migrations
    // For now, we'll create the schema using raw SQL
    
    const migrationQueries = [
      // Add BRDR-specific fields to brdr_documents
      `ALTER TABLE brdr_documents 
       ADD COLUMN IF NOT EXISTS doc_uuid TEXT,
       ADD COLUMN IF NOT EXISTS doc_type_code TEXT,
       ADD COLUMN IF NOT EXISTS doc_type_desc TEXT,
       ADD COLUMN IF NOT EXISTS version_code TEXT,
       ADD COLUMN IF NOT EXISTS doc_long_title TEXT,
       ADD COLUMN IF NOT EXISTS doc_desc TEXT,
       ADD COLUMN IF NOT EXISTS issue_date TIMESTAMPTZ,
       ADD COLUMN IF NOT EXISTS guideline_no TEXT,
       ADD COLUMN IF NOT EXISTS supersession_date TIMESTAMPTZ,
       ADD COLUMN IF NOT EXISTS concepts TEXT[] DEFAULT '{}',
       ADD COLUMN IF NOT EXISTS doc_topic_subtopic_list JSONB,
       ADD COLUMN IF NOT EXISTS doc_keyword_list JSONB,
       ADD COLUMN IF NOT EXISTS doc_ai_type_list JSONB,
       ADD COLUMN IF NOT EXISTS doc_view_list JSONB,
       ADD COLUMN IF NOT EXISTS directly_related_doc_list JSONB,
       ADD COLUMN IF NOT EXISTS version_history_doc_list JSONB,
       ADD COLUMN IF NOT EXISTS reference_doc_list JSONB,
       ADD COLUMN IF NOT EXISTS superseded_doc_list JSONB;`,
      
      // Create topics table
      `CREATE TABLE IF NOT EXISTS topics (
        id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        topic_code TEXT UNIQUE NOT NULL,
        topic_desc TEXT NOT NULL,
        subtopic_code TEXT,
        subtopic_desc TEXT,
        topic_subtopic_code TEXT,
        topic_subtopic_desc TEXT,
        display_sequence INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`,
      
      // Create concepts table
      `CREATE TABLE IF NOT EXISTS concepts (
        id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        concept_name TEXT UNIQUE NOT NULL,
        concept_type TEXT,
        description TEXT,
        weight FLOAT DEFAULT 1.0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`,
      
      // Create document_topics table
      `CREATE TABLE IF NOT EXISTS document_topics (
        id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        document_id UUID NOT NULL REFERENCES brdr_documents(id) ON DELETE CASCADE,
        topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        weight FLOAT DEFAULT 1.0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(document_id, topic_id)
      );`,
      
      // Create document_concepts table
      `CREATE TABLE IF NOT EXISTS document_concepts (
        id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        document_id UUID NOT NULL REFERENCES brdr_documents(id) ON DELETE CASCADE,
        concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        weight FLOAT DEFAULT 1.0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(document_id, concept_id)
      );`,
      
      // Create concept_keywords table
      `CREATE TABLE IF NOT EXISTS concept_keywords (
        id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
        concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
        keyword_id UUID NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
        weight FLOAT DEFAULT 1.0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(concept_id, keyword_id)
      );`,
      
      // Add indexes
      `CREATE INDEX IF NOT EXISTS idx_brdr_documents_doc_type_code ON brdr_documents(doc_type_code);`,
      `CREATE INDEX IF NOT EXISTS idx_brdr_documents_issue_date ON brdr_documents(issue_date);`,
      `CREATE INDEX IF NOT EXISTS idx_brdr_documents_version_code ON brdr_documents(version_code);`,
      `CREATE INDEX IF NOT EXISTS idx_topics_topic_code ON topics(topic_code);`,
      `CREATE INDEX IF NOT EXISTS idx_topics_subtopic_code ON topics(subtopic_code);`,
      `CREATE INDEX IF NOT EXISTS idx_topics_topic_subtopic_code ON topics(topic_subtopic_code);`,
      `CREATE INDEX IF NOT EXISTS idx_concepts_concept_name ON concepts(concept_name);`,
      `CREATE INDEX IF NOT EXISTS idx_concepts_concept_type ON concepts(concept_type);`,
      `CREATE INDEX IF NOT EXISTS idx_concepts_weight ON concepts(weight);`,
      `CREATE INDEX IF NOT EXISTS idx_document_topics_weight ON document_topics(weight);`,
      `CREATE INDEX IF NOT EXISTS idx_document_concepts_weight ON document_concepts(weight);`,
      `CREATE INDEX IF NOT EXISTS idx_concept_keywords_weight ON concept_keywords(weight);`
    ];
    
    for (const query of migrationQueries) {
      console.log(`Executing: ${query.substring(0, 50)}...`);
      await prisma.$executeRawUnsafe(query);
    }
    
    console.log('✅ Enhanced schema migration completed successfully!');
    
    // Test the new schema
    console.log('🧪 Testing new schema...');
    
    // Test topics table
    const topicCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM topics`;
    console.log(`Topics table: ${JSON.stringify(topicCount)}`);
    
    // Test concepts table
    const conceptCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM concepts`;
    console.log(`Concepts table: ${JSON.stringify(conceptCount)}`);
    
    // Test document_topics table
    const docTopicCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM document_topics`;
    console.log(`Document topics table: ${JSON.stringify(docTopicCount)}`);
    
    console.log('✅ Schema test completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateEnhancedSchema()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateEnhancedSchema }; 