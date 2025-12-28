/**
 * Direct test of CSV parsing from Google Sheets
 * This will show us exactly what's in the CSV and how it's being parsed
 */

const SHEET_ID = "13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (i + 1 < line.length && line[i + 1] === '"' && inQuotes) {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  
  while (result.length < 2) {
    result.push('');
  }
  
  return result;
}

async function testCSVDirect() {
  console.log('🔍 Testing CSV Parsing Directly from Google Sheets\n');
  console.log(`📥 Fetching CSV from: ${CSV_URL}\n`);

  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const csvText = await response.text();
    console.log(`✅ CSV fetched (${csvText.length} characters)\n`);

    // Show first few lines
    const allLines = csvText.split('\n');
    console.log('='.repeat(60));
    console.log('FIRST 15 LINES OF CSV:');
    console.log('='.repeat(60));
    allLines.slice(0, 15).forEach((line, idx) => {
      console.log(`Line ${idx}: "${line}"`);
    });

    // Normalize line endings
    const normalizedCsv = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedCsv.split('\n').filter(line => line.trim().length > 0);

    console.log('\n' + '='.repeat(60));
    console.log('PARSING RESULTS:');
    console.log('='.repeat(60));

    // Parse header
    if (lines.length > 0) {
      const headerColumns = parseCSVLine(lines[0]);
      console.log(`\nHeader (${headerColumns.length} columns):`);
      headerColumns.forEach((col, idx) => {
        console.log(`  Column ${idx} (${String.fromCharCode(65 + idx)}): "${col}"`);
      });
    }

    // Parse data rows
    const guests = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.trim()) {
        const columns = parseCSVLine(line);
        const name = columns[0]?.replace(/"/g, '').trim();
        const familyGroup = columns[1]?.replace(/"/g, '').trim() || '';

        // Show all rows with Leo or Monica
        if (name && (name.toLowerCase().includes('leo') || name.toLowerCase().includes('monica'))) {
          console.log(`\nRow ${i} (Data Row ${i - 1}):`);
          console.log(`  Raw line: "${line.substring(0, 150)}"`);
          console.log(`  Parsed columns (${columns.length}):`);
          columns.forEach((col, idx) => {
            console.log(`    Column ${idx} (${String.fromCharCode(65 + idx)}): "${col}"`);
          });
          console.log(`  → Name: "${name}"`);
          console.log(`  → Family Group: "${familyGroup}"`);
        }

        if (name && name.length > 0) {
          guests.push({
            name,
            rowIndex: i - 1,
            familyGroup: familyGroup && familyGroup.length > 0 ? familyGroup : undefined
          });
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('GUESTS WITH LEO OR MONICA:');
    console.log('='.repeat(60));
    const leoMonicaGuests = guests.filter(g => 
      g.name.toLowerCase().includes('leo') || 
      g.name.toLowerCase().includes('monica')
    );
    
    if (leoMonicaGuests.length === 0) {
      console.log('❌ No guests found with "Leo" or "Monica" in name');
    } else {
      leoMonicaGuests.forEach((g, idx) => {
        console.log(`\n${idx + 1}. ${g.name}`);
        console.log(`   Family Group: "${g.familyGroup || 'None'}"`);
        console.log(`   Row Index: ${g.rowIndex}`);
      });

      // Check if they have the same family group
      const leoGuest = leoMonicaGuests.find(g => g.name.toLowerCase().includes('leo'));
      const monicaGuest = leoMonicaGuests.find(g => g.name.toLowerCase().includes('monica'));

      if (leoGuest && monicaGuest) {
        console.log('\n' + '='.repeat(60));
        console.log('FAMILY GROUP COMPARISON:');
        console.log('='.repeat(60));
        console.log(`Leo Hany Family Group: "${leoGuest.familyGroup || 'None'}"`);
        console.log(`Monica Atef Family Group: "${monicaGuest.familyGroup || 'None'}"`);
        
        if (leoGuest.familyGroup && monicaGuest.familyGroup) {
          const match = leoGuest.familyGroup.trim() === monicaGuest.familyGroup.trim();
          console.log(`\nMatch: ${match ? '✅ YES' : '❌ NO'}`);
          if (!match) {
            console.log(`\n⚠️  ISSUE: Family groups don't match!`);
            console.log(`   Leo: "${leoGuest.familyGroup}" (length: ${leoGuest.familyGroup.length})`);
            console.log(`   Monica: "${monicaGuest.familyGroup}" (length: ${monicaGuest.familyGroup.length})`);
            console.log(`   Character codes:`);
            console.log(`   Leo: [${Array.from(leoGuest.familyGroup).map(c => c.charCodeAt(0)).join(', ')}]`);
            console.log(`   Monica: [${Array.from(monicaGuest.familyGroup).map(c => c.charCodeAt(0)).join(', ')}]`);
          }
        } else {
          console.log(`\n⚠️  ISSUE: One or both family groups are empty!`);
        }
      }
    }

    console.log(`\n\nTotal guests parsed: ${guests.length}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testCSVDirect().catch(console.error);

