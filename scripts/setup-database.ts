import { prisma } from '../lib/prisma';
import { logEnvironmentStatus } from '../lib/env';

async function setupDatabase() {
  console.log('🔧 Database Setup and Test');
  console.log('===========================');
  
  // Log environment status
  logEnvironmentStatus();

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful!');
    } catch (error) {
      console.log('❌ Database connection failed:', error);
      console.log('');
      console.log('Please check:');
      console.log('1. Your DATABASE_URL in .env file');
      console.log('2. Database permissions');
      console.log('3. Network connectivity');
      return;
    }

    // Check if enhanced tables exist
    console.log('\n2. Checking enhanced schema...');
    
    const tablesToCheck = [
      { name: 'keywords', model: prisma.keywords },
      { name: 'chunk_relationships', model: prisma.chunk_relationships },
      { name: 'keyword_relationships', model: prisma.keyword_relationships },
      { name: 'document_keywords', model: prisma.document_keywords },
      { name: 'chunk_keywords', model: prisma.chunk_keywords },
      { name: 'document_metadata', model: prisma.document_metadata },
      { name: 'image_content', model: prisma.image_content }
    ];

    for (const table of tablesToCheck) {
      try {
        await table.model.findFirst();
        console.log(`✅ Table '${table.name}' exists`);
      } catch (err) {
        console.log(`❌ Table '${table.name}' not found`);
        console.log('   Run: npm run db:migrate:prisma');
        return;
      }
    }

    console.log('\n✅ Enhanced schema is ready!');
    console.log('\n3. Testing basic operations...');

    // Test inserting a sample document
    const testDoc = {
      doc_id: 'test_doc_' + Date.now(),
      content: 'This is a test document for ETL pipeline setup.',
      source: 'BRDRAPI',
      keywords: ['test', 'setup'],
      topics: ['testing'],
      summary: 'Test document for setup verification.',
      document_type: 'test',
      language: 'en'
    };

    try {
      const insertData = await prisma.brdr_documents.create({
        data: testDoc
      });

      console.log('✅ Test document inserted successfully');
      console.log(`   Document ID: ${insertData.id}`);

      // Clean up test document
      await prisma.brdr_documents.delete({
        where: { id: insertData.id }
      });

      console.log('✅ Test document cleaned up');
    } catch (insertError) {
      console.log('❌ Error inserting test document:', insertError);
      return;
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: npm run etl:example');
    console.log('2. Or run: npm run etl:process');
    console.log('3. Check the ETL_SETUP_GUIDE.md for more details');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Check your .env file has DATABASE_URL');
    console.log('2. Ensure your database is accessible');
    console.log('3. Run: npm run db:migrate:prisma');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupDatabase().catch(console.error); 