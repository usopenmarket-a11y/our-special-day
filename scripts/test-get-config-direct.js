// Test get-config function directly
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Read from .env file
const envContent = readFileSync(join(projectRoot, '.env'), 'utf8');
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

const SUPABASE_URL = envVars.VITE_SUPABASE_URL || 'https://gosvleaijwscbrrnqkkt.supabase.co';
const SUPABASE_KEY = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;

async function testGetConfig() {
  console.log('🧪 Testing get-config function directly...\n');
  console.log(`URL: ${SUPABASE_URL}/functions/v1/get-config\n`);

  try {
    // Test 1: OPTIONS request (CORS preflight)
    console.log('1️⃣ Testing OPTIONS (CORS preflight)...');
    const optionsResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-config`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:8080',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
      }
    });
    console.log(`   Status: ${optionsResponse.status} ${optionsResponse.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(optionsResponse.headers.entries()));
    console.log('');

    // Test 2: POST request with auth
    console.log('2️⃣ Testing POST with authentication...');
    const postResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({})
    });

    console.log(`   Status: ${postResponse.status} ${postResponse.statusText}`);
    console.log(`   Headers:`, Object.fromEntries(postResponse.headers.entries()));
    
    const responseText = await postResponse.text();
    console.log(`   Response: ${responseText.substring(0, 200)}`);
    
    if (postResponse.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('\n✅ Success! Config data:');
        console.log(JSON.stringify(data, null, 2));
      } catch (e) {
        console.log('\n⚠️  Response is not JSON:', responseText);
      }
    } else {
      console.log('\n❌ Error response:', responseText);
    }

    // Test 3: GET request (some functions accept GET)
    console.log('\n3️⃣ Testing GET request...');
    const getResponse = await fetch(`${SUPABASE_URL}/functions/v1/get-config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
      }
    });
    console.log(`   Status: ${getResponse.status} ${getResponse.statusText}`);
    const getText = await getResponse.text();
    console.log(`   Response: ${getText.substring(0, 200)}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testGetConfig();

