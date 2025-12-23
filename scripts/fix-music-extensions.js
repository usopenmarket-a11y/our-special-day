import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root (parent of scripts folder)
const projectRoot = path.resolve(__dirname, '..');
const musicDir = path.join(projectRoot, 'public', 'music');

// Read all files from public/music directory
function fixExtensions() {
  try {
    if (!fs.existsSync(musicDir)) {
      console.log('📁 Music directory does not exist:', musicDir);
      return;
    }

    const files = fs.readdirSync(musicDir);
    let renamedCount = 0;

    files.forEach(file => {
      const filePath = path.join(musicDir, file);
      const ext = path.extname(file).toLowerCase();
      
      // Skip if already correct extension
      if (ext === '.m4a' || ext === '.mp4') {
        return;
      }

      // Check file header to detect actual format
      try {
        const buffer = fs.readFileSync(filePath, { start: 0, end: 20 });
        const header = buffer.toString('hex');
        
        // Check for MP4/M4A format
        if (header.includes('667479706d703432') || header.includes('667479704d3441')) {
          // File is MP4/M4A but has wrong extension
          const newName = path.basename(file, ext) + '.m4a';
          const newPath = path.join(musicDir, newName);
          
          // Check if new name already exists
          if (fs.existsSync(newPath)) {
            console.log(`⚠️  Skipping "${file}" - "${newName}" already exists`);
            return;
          }
          
          fs.renameSync(filePath, newPath);
          console.log(`✅ Renamed: "${file}" → "${newName}"`);
          renamedCount++;
        }
      } catch (err) {
        console.error(`❌ Error processing "${file}":`, err.message);
      }
    });

    if (renamedCount === 0) {
      console.log('✅ All files have correct extensions or no files need renaming');
    } else {
      console.log(`\n✅ Renamed ${renamedCount} file(s). Run 'npm run generate-music' to update the music list.`);
    }
  } catch (error) {
    console.error('Error fixing extensions:', error);
  }
}

// Run the fix
fixExtensions();

