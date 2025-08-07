import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from multiple possible locations
const envPaths = [
  '.env.local',
  '.env',
  '.env.development',
  '.env.production'
];

// Try to load from each path
envPaths.forEach(path => {
  try {
    config({ path: resolve(process.cwd(), path) });
  } catch (error) {
    // Silently ignore if file doesn't exist
  }
});

// Helper function to get environment variable with validation
export function getEnvVar(name: string, required: boolean = false): string | undefined {
  const value = process.env[name];
  
  if (required && !value) {
    throw new Error(`Environment variable ${name} is required but not set.`);
  }
  
  return value;
}

// Supabase configuration
const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL') || getEnvVar('SUPABASE_URL');
const supabaseAnonKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnvVar('SUPABASE_ANON_KEY');

// Validate Supabase configuration
if (!supabaseUrl) {
  throw new Error(
    'Supabase URL is required. Please set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL in your .env file.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    'Supabase Anon Key is required. Please set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY in your .env file.'
  );
}

export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey
};

// OpenAI configuration
export const OPENAI_CONFIG = {
  apiKey: getEnvVar('OPENAI_API_KEY'),
  organization: getEnvVar('OPENAI_ORGANIZATION')
};

// Database configuration
export const DATABASE_CONFIG = {
  url: getEnvVar('DATABASE_URL')
};

// Log environment status (without sensitive data)
export function logEnvironmentStatus() {
  console.log('🔧 Environment Configuration:');
  console.log(`   Supabase URL: ${SUPABASE_CONFIG.url ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Supabase Key: ${SUPABASE_CONFIG.anonKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   OpenAI Key: ${OPENAI_CONFIG.apiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Database URL: ${DATABASE_CONFIG.url ? '✅ Set' : '❌ Missing'}`);
  console.log('');
} 