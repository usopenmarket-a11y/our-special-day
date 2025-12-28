// Verify JWT token matches project
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const EXPECTED_PROJECT_REF = 'gosvleaijwscbrrnqkkt';

console.log('🔍 Verifying JWT Token...\n');

try {
  const envContent = readFileSync(join(projectRoot, '.env'), 'utf8');
  
  // Parse .env
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        envVars[key.trim()] = value;
      }
    }
  });

  const jwt = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = envVars.VITE_SUPABASE_URL;

  if (!jwt) {
    console.log('❌ VITE_SUPABASE_PUBLISHABLE_KEY not found in .env');
    process.exit(1);
  }

  // Decode JWT payload
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      console.log('❌ Invalid JWT format');
      process.exit(1);
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const jwtProjectRef = payload.ref;

    console.log(`📋 JWT Project Ref: ${jwtProjectRef}`);
    console.log(`📋 Expected Project Ref: ${EXPECTED_PROJECT_REF}`);
    console.log(`📋 URL Project Ref: ${url ? url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] : 'N/A'}`);
    console.log('');

    if (jwtProjectRef === EXPECTED_PROJECT_REF) {
      console.log('✅ JWT token matches project!');
      console.log('✅ Configuration is correct');
    } else {
      console.log('❌ JWT token is for DIFFERENT project!');
      console.log(`   Token is for: ${jwtProjectRef}`);
      console.log(`   Should be for: ${EXPECTED_PROJECT_REF}`);
      console.log('');
      console.log('🔧 Fix: Get the correct anon key from:');
      console.log(`   https://supabase.com/dashboard/project/${EXPECTED_PROJECT_REF}/settings/api`);
      process.exit(1);
    }

  } catch (e) {
    console.log('❌ Error decoding JWT:', e.message);
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Error reading .env:', error.message);
  process.exit(1);
}

