import { logEnvironmentStatus, SUPABASE_CONFIG, OPENAI_CONFIG, DATABASE_CONFIG } from '../lib/env';

console.log('🧪 Environment Variable Test');
console.log('============================');

try {
  // Log environment status
  logEnvironmentStatus();
  
  console.log('✅ Environment variables loaded successfully!');
  console.log('');
  console.log('📋 Configuration Summary:');
  console.log(`   Supabase URL: ${SUPABASE_CONFIG.url ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Supabase Key: ${SUPABASE_CONFIG.anonKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   OpenAI Key: ${OPENAI_CONFIG.apiKey ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Database URL: ${DATABASE_CONFIG.url ? '✅ Configured' : '❌ Missing'}`);
  console.log('');
  
  if (SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey) {
    console.log('🎉 Supabase configuration is ready!');
    console.log('   You can now run: npm run db:test');
  } else {
    console.log('❌ Supabase configuration is incomplete.');
    console.log('   Please check your .env file.');
  }
  
} catch (error) {
  console.error('❌ Environment setup failed:', error);
  console.log('');
  console.log('🔧 Troubleshooting:');
  console.log('1. Check that your .env file exists');
  console.log('2. Verify NEXT_PUBLIC_SUPABASE_URL is set');
  console.log('3. Verify NEXT_PUBLIC_SUPABASE_ANON_KEY is set');
  console.log('4. Make sure the .env file is in the project root');
} 