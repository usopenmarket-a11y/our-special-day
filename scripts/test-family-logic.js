/**
 * Direct test of family group search logic
 * Simulates what happens when searching for "Leo Hany"
 */

// Simulate CSV data from Google Sheets
const mockCSVData = `Name,Family Group,Confirmation,Date,Time
Leo Hany,Leo Hany Family,,,
Monica Atef,Leo Hany Family,,,
Fady Adel,Fady Adel Family,,,
Sarah Adel,Fady Adel Family,,,
John Doe,,,,
`;

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

function testFamilySearch() {
  console.log('🧪 Testing Family Group Search Logic\n');
  console.log('='.repeat(60));
  
  // Parse CSV
  const lines = mockCSVData.split('\n');
  const guests = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const columns = parseCSVLine(line);
      const name = columns[0]?.replace(/"/g, '').trim();
      const familyGroup = columns[1]?.replace(/"/g, '').trim() || '';
      
      if (name && name.length > 0) {
        guests.push({
          name,
          rowIndex: i - 1,
          familyGroup: familyGroup && familyGroup.length > 0 ? familyGroup : undefined
        });
      }
    }
  }
  
  console.log(`📋 Parsed ${guests.length} guests from CSV:\n`);
  guests.forEach((g, i) => {
    console.log(`   ${i + 1}. ${g.name} (Family: "${g.familyGroup || 'None'}", rowIndex: ${g.rowIndex})`);
  });
  
  // Test search for "Leo Hany"
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Searching for "Leo Hany"\n');
  
  const searchQuery = 'Leo Hany';
  const query = searchQuery.toLowerCase().trim();
  
  // Find matching guests
  const matchingGuests = guests.filter(guest => 
    guest.name.toLowerCase().includes(query)
  );
  
  console.log(`✅ Found ${matchingGuests.length} matching guest(s):`);
  matchingGuests.forEach(g => {
    console.log(`   - ${g.name} (Family: "${g.familyGroup || 'None'}")`);
  });
  
  // Collect family groups
  const familyGroups = new Set();
  matchingGuests.forEach(guest => {
    if (guest.familyGroup && guest.familyGroup.trim().length > 0) {
      familyGroups.add(guest.familyGroup.trim());
    }
  });
  
  console.log(`\n👥 Found ${familyGroups.size} unique family group(s):`);
  Array.from(familyGroups).forEach(fg => {
    console.log(`   - "${fg}"`);
  });
  
  // Find related guests
  const relatedGuests = guests.filter(guest => 
    guest.familyGroup && 
    guest.familyGroup.trim().length > 0 &&
    familyGroups.has(guest.familyGroup.trim())
  );
  
  console.log(`\n👨‍👩‍👧‍👦 Found ${relatedGuests.length} related family member(s):`);
  relatedGuests.forEach(g => {
    const isMatching = matchingGuests.some(m => m.rowIndex === g.rowIndex);
    console.log(`   ${isMatching ? '🎯' : '→'} ${g.name} (Family: "${g.familyGroup}")`);
  });
  
  // Combine results
  const allRelatedGuests = new Map();
  matchingGuests.forEach(guest => {
    allRelatedGuests.set(guest.rowIndex, guest);
  });
  relatedGuests.forEach(guest => {
    allRelatedGuests.set(guest.rowIndex, guest);
  });
  
  const filteredGuests = Array.from(allRelatedGuests.values());
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS\n');
  console.log(`Total guests to return: ${filteredGuests.length}\n`);
  filteredGuests.forEach((g, i) => {
    const isMatching = matchingGuests.some(m => m.rowIndex === g.rowIndex);
    console.log(`   ${i + 1}. ${isMatching ? '🎯' : '👥'} ${g.name} (Family: "${g.familyGroup || 'None'}")`);
  });
  
  // Verify
  console.log('\n' + '='.repeat(60));
  console.log('✅ VERIFICATION\n');
  
  const hasLeoHany = filteredGuests.some(g => 
    g.name.toLowerCase().includes('leo') && g.name.toLowerCase().includes('hany')
  );
  const hasMonicaAtef = filteredGuests.some(g => 
    g.name.toLowerCase().includes('monica') && g.name.toLowerCase().includes('atef')
  );
  
  console.log(`   Leo Hany: ${hasLeoHany ? '✅ FOUND' : '❌ NOT FOUND'}`);
  console.log(`   Monica Atef: ${hasMonicaAtef ? '✅ FOUND' : '❌ NOT FOUND'}`);
  
  if (hasLeoHany && hasMonicaAtef) {
    console.log('\n🎉 SUCCESS: Logic is correct! Both names should appear.');
  } else {
    console.log('\n❌ FAILED: Logic has issues. Need to debug.');
  }
}

testFamilySearch();

