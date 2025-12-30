import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('\n🎵 Starting Dev Server and Music Controls Test');
console.log('='.repeat(60));
console.log('This will:');
console.log('1. Start the dev server');
console.log('2. Wait for it to be ready');
console.log('3. Run the music controls test');
console.log('4. Clean up when done');
console.log('='.repeat(60) + '\n');

// Start dev server
console.log('🚀 Starting dev server...');
const devServer = spawn('npm', ['run', 'dev'], {
  cwd: projectRoot,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverReady = false;
const serverUrl = 'http://localhost:5173';

// Wait for server to be ready
devServer.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  if (output.includes('Local:') || output.includes('localhost:5173') || output.includes('ready in')) {
    if (!serverReady) {
      serverReady = true;
      console.log('\n✅ Dev server is ready!');
      console.log('⏳ Waiting 3 seconds for server to fully initialize...\n');
      
      setTimeout(async () => {
        try {
          // Import and run the test
          const testModule = await import('./test-music-controls.js');
          console.log('🧪 Running music controls test...\n');
          
          // The test will run and then we'll clean up
          setTimeout(() => {
            console.log('\n🛑 Stopping dev server...');
            devServer.kill();
            process.exit(0);
          }, 60000); // Give tests 60 seconds to complete
        } catch (error) {
          console.error('❌ Error running tests:', error);
          devServer.kill();
          process.exit(1);
        }
      }, 3000);
    }
  }
});

devServer.stderr.on('data', (data) => {
  const output = data.toString();
  // Only show errors, not warnings
  if (output.includes('Error') || output.includes('error')) {
    process.stderr.write(output);
  }
});

devServer.on('close', (code) => {
  if (code !== 0 && !serverReady) {
    console.error('\n❌ Dev server exited with error');
    process.exit(1);
  }
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Stopping dev server...');
  devServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Stopping dev server...');
  devServer.kill();
  process.exit(0);
});

