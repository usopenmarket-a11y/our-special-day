// Check what Vite sees from .env file
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Checking .env file and Vite configuration...\n');

// Read .env file
try {
  const envContent = readFileSync(join(projectRoot, '.env'), 'utf8');
  console.log('📄 .env file content:');
  console.log(envContent);
  console.log('');

  // Parse .env manually
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        envVars[key.trim()] = cleanValue;
      }
    }
  });

  console.log('📋 Parsed environment variables:');
  console.log(`   VITE_SUPABASE_URL: ${envVars.VITE_SUPABASE_URL || 'NOT FOUND'}`);
  console.log(`   VITE_SUPABASE_PUBLISHABLE_KEY: ${envVars.VITE_SUPABASE_PUBLISHABLE_KEY ? envVars.VITE_SUPABASE_PUBLISHABLE_KEY.substring(0, 50) + '...' : 'NOT FOUND'}`);
  console.log('');

  // Check if values are correct
  if (!envVars.VITE_SUPABASE_URL || !envVars.VITE_SUPABASE_PUBLISHABLE_KEY) {
    console.log('❌ Missing required environment variables!');
  } else if (envVars.VITE_SUPABASE_URL.includes('placeholder')) {
    console.log('⚠️  Using placeholder values!');
  } else {
    console.log('✅ Environment variables look correct');
  }

} catch (error) {
  console.error('❌ Error reading .env file:', error.message);
  console.log('\n💡 Make sure .env file exists in project root');
}

