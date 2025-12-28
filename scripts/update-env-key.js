// Helper script to update the anon key in .env file
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const envPath = join(projectRoot, '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function updateKey() {
  console.log('🔧 Update Supabase Anon Key\n');
  console.log('1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/api');
  console.log('2. Copy the "anon public" key\n');
  
  const newKey = await question('Paste the new anon key here: ');
  
  if (!newKey || newKey.trim().length < 50) {
    console.log('❌ Invalid key. Key should be a long string starting with eyJ...');
    rl.close();
    process.exit(1);
  }

  try {
    // Read current .env
    let envContent = readFileSync(envPath, 'utf8');
    
    // Remove BOM if present
    envContent = envContent.replace(/^\uFEFF/, '');
    
    // Update the key
    const cleanKey = newKey.trim().replace(/^["']|["']$/g, '');
    const updated = envContent.replace(
      /VITE_SUPABASE_PUBLISHABLE_KEY=.*/,
      `VITE_SUPABASE_PUBLISHABLE_KEY=${cleanKey}`
    );
    
    // Write back
    writeFileSync(envPath, updated, 'utf8');
    
    console.log('\n✅ .env file updated!');
    console.log('\n⚠️  IMPORTANT: Restart your dev server now:');
    console.log('   1. Stop: Ctrl+C');
    console.log('   2. Start: npm run dev\n');
    
    // Verify
    console.log('🔍 Verifying...');
    const verifyScript = join(__dirname, 'verify-jwt.js');
    const { exec } = await import('child_process');
    exec(`node ${verifyScript}`, (error, stdout, stderr) => {
      if (error) {
        console.log('⚠️  Verification failed:', error.message);
      } else {
        console.log(stdout);
      }
      rl.close();
    });
    
  } catch (error) {
    console.error('❌ Error updating .env:', error.message);
    rl.close();
    process.exit(1);
  }
}

updateKey();

