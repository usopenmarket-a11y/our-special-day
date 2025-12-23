import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root (parent of scripts folder)
const projectRoot = path.resolve(__dirname, '..');
const musicDir = path.join(projectRoot, 'public', 'music');

// Check all audio files and detect their actual format
function checkMusicFiles() {
  try {
    if (!fs.existsSync(musicDir)) {
      console.log('❌ Music directory does not exist:', musicDir);
      return;
    }

    const files = fs.readdirSync(musicDir);
    const audioFiles = files.filter(file => {
      const ext = file.toLowerCase();
      return ext.endsWith('.mp3') || ext.endsWith('.mp4') || ext.endsWith('.m4a');
    });

    if (audioFiles.length === 0) {
      console.log('⚠️  No audio files found in public/music/ folder');
      console.log('   Supported formats: .mp3, .mp4, .m4a');
      return;
    }

    console.log(`\n📁 Found ${audioFiles.length} audio file(s) in public/music/:\n`);

    audioFiles.forEach((file, index) => {
      const filePath = path.join(musicDir, file);
      const ext = path.extname(file).toLowerCase();
      const stats = fs.statSync(filePath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`${index + 1}. ${file}`);
      console.log(`   📏 Size: ${sizeMB} MB`);
      console.log(`   📄 Extension: ${ext}`);
      
      // Check actual file format
      try {
        const buffer = fs.readFileSync(filePath, { start: 0, end: 30 });
        const header = buffer.toString('hex');
        
        let actualFormat = 'Unknown';
        let status = '❓';
        
        // Check for MP4/M4A format
        if (header.includes('667479706d703432') || header.includes('667479704d3441') || header.includes('66747970')) {
          actualFormat = 'MP4/M4A';
          status = ext === '.m4a' || ext === '.mp4' ? '✅' : '⚠️';
        }
        // Check for MP3 format
        else if (header.startsWith('494433') || header.startsWith('fffb') || header.startsWith('fff3')) {
          actualFormat = 'MP3';
          status = ext === '.mp3' ? '✅' : '⚠️';
        }
        
        console.log(`   🎵 Actual format: ${actualFormat} ${status}`);
        
        if (actualFormat === 'MP4/M4A' && ext !== '.m4a' && ext !== '.mp4') {
          console.log(`   ⚠️  WARNING: File is ${actualFormat} but has ${ext} extension!`);
          console.log(`   💡 Consider renaming to .m4a or converting to MP3`);
        } else if (actualFormat === 'MP3' && ext !== '.mp3') {
          console.log(`   ⚠️  WARNING: File is ${actualFormat} but has ${ext} extension!`);
          console.log(`   💡 Consider renaming to .mp3`);
        }
        
        // Show first few bytes for debugging
        const preview = header.substring(0, 40);
        console.log(`   🔍 Header preview: ${preview}...`);
        
      } catch (err) {
        console.log(`   ❌ Error reading file: ${err.message}`);
      }
      
      console.log('');
    });

    // Summary
    const mp3Files = audioFiles.filter(f => f.toLowerCase().endsWith('.mp3'));
    const m4aFiles = audioFiles.filter(f => f.toLowerCase().endsWith('.m4a') || f.toLowerCase().endsWith('.mp4'));
    
    console.log(`\n📊 Summary:`);
    console.log(`   MP3 files: ${mp3Files.length}`);
    console.log(`   M4A/MP4 files: ${m4aFiles.length}`);
    
    if (m4aFiles.length > 0 && mp3Files.length === 0) {
      console.log(`\n💡 Recommendation: Convert M4A files to MP3 for better browser compatibility`);
      console.log(`   See CONVERT_TO_MP3.md for instructions`);
    }
    
  } catch (error) {
    console.error('Error checking music files:', error);
  }
}

// Run the check
checkMusicFiles();

