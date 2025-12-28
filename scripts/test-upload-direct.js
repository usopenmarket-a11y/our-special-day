// Test upload function directly to see what's happening
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

console.log('🧪 Testing upload-photo function...\n');

// Create a small test image (1x1 pixel PNG in base64)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const testPayload = {
  fileName: 'test-upload.png',
  mimeType: 'image/png',
  base64: testImageBase64,
  folderId: '1uTizlj_-8c6KqODuWcIr8N4VscIwYJJL'
};

console.log('📤 Sending test upload...');
console.log(`Folder ID: ${testPayload.folderId}`);
console.log(`File: ${testPayload.fileName}\n`);

try {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/upload-photo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
    },
    body: JSON.stringify(testPayload)
  });

  console.log(`Status: ${response.status} ${response.statusText}`);
  
  const responseText = await response.text();
  console.log(`Response: ${responseText}\n`);

  if (response.ok) {
    try {
      const data = JSON.parse(responseText);
      if (data.success === true && data.id) {
        console.log('✅ Upload successful!');
        console.log(`   File ID: ${data.id}`);
        console.log(`   File Name: ${data.name}`);
        console.log(`   URL: ${data.url}`);
      } else {
        console.log('❌ Upload failed - invalid response');
        console.log(`   Success: ${data.success}`);
        console.log(`   Error: ${data.error || 'No error message'}`);
      }
    } catch (e) {
      console.log('❌ Invalid JSON response:', responseText);
    }
  } else {
    console.log('❌ Upload failed');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${responseText}`);
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}

