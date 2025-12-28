/**
 * Test script to verify family group search functionality
 * Tests that searching for "Leo Hany" returns both "Leo Hany" and "Monica Atef"
 */

// This is a simple test to verify the logic
// In a real scenario, you would test against the actual API

const testFamilySearch = () => {
  console.log('🧪 Testing Family Group Search Logic\n');
  
  // Mock guest data (simulating what would come from Google Sheets)
  const mockGuests = [
    { name: 'Leo Hany', rowIndex: 9, familyGroup: 'Leo Hany Family' },
    { name: 'Monica Atef', rowIndex: 10, familyGroup: 'Leo Hany Family' },
    { name: 'Fady Adel', rowIndex: 0, familyGroup: 'Fady Adel Family' },
    { name: 'Sarah Adel', rowIndex: 1, familyGroup: 'Fady Adel Family' },
    { name: 'John Doe', rowIndex: 20, familyGroup: undefined },
  ];

  const searchQuery = 'Leo Hany';
  const query = searchQuery.toLowerCase();

  console.log(`Search Query: "${searchQuery}"\n`);

  // Step 1: Find matching guests
  const matchingGuests = mockGuests.filter(guest => 
    guest.name.toLowerCase().includes(query)
  );

  console.log('Step 1: Matching Guests');
  console.log('─'.repeat(50));
  matchingGuests.forEach(guest => {
    console.log(`  ✓ ${guest.name} (Family: ${guest.familyGroup || 'None'})`);
  });
  console.log(`  Total: ${matchingGuests.length}\n`);

  // Step 2: Collect family groups
  const familyGroups = new Set();
  matchingGuests.forEach(guest => {
    if (guest.familyGroup) {
      familyGroups.add(guest.familyGroup);
    }
  });

  console.log('Step 2: Family Groups Found');
  console.log('─'.repeat(50));
  familyGroups.forEach(group => {
    console.log(`  ✓ ${group}`);
  });
  console.log(`  Total: ${familyGroups.size}\n`);

  // Step 3: Find all guests in those family groups
  const relatedGuests = mockGuests.filter(guest => 
    guest.familyGroup && familyGroups.has(guest.familyGroup)
  );

  console.log('Step 3: Related Family Members');
  console.log('─'.repeat(50));
  relatedGuests.forEach(guest => {
    const isMatching = matchingGuests.some(m => m.rowIndex === guest.rowIndex);
    console.log(`  ${isMatching ? '✓' : '→'} ${guest.name} (Family: ${guest.familyGroup})`);
  });
  console.log(`  Total: ${relatedGuests.length}\n`);

  // Step 4: Combine and remove duplicates
  const allRelatedGuests = new Map();
  matchingGuests.forEach(guest => {
    allRelatedGuests.set(guest.rowIndex, guest);
  });
  relatedGuests.forEach(guest => {
    allRelatedGuests.set(guest.rowIndex, guest);
  });

  const filteredGuests = Array.from(allRelatedGuests.values());

  console.log('Step 4: Final Results (Combined & Deduplicated)');
  console.log('─'.repeat(50));
  filteredGuests.forEach(guest => {
    const isMatching = matchingGuests.some(m => m.rowIndex === guest.rowIndex);
    console.log(`  ${isMatching ? '🎯' : '👥'} ${guest.name} (Family: ${guest.familyGroup || 'None'})`);
  });
  console.log(`  Total: ${filteredGuests.length}\n`);

  // Verify expected results
  console.log('✅ Verification');
  console.log('─'.repeat(50));
  
  const hasLeoHany = filteredGuests.some(g => g.name === 'Leo Hany');
  const hasMonicaAtef = filteredGuests.some(g => g.name === 'Monica Atef');
  
  console.log(`  Leo Hany found: ${hasLeoHany ? '✅' : '❌'}`);
  console.log(`  Monica Atef found: ${hasMonicaAtef ? '✅' : '❌'}`);
  
  if (hasLeoHany && hasMonicaAtef) {
    console.log('\n🎉 SUCCESS: Both family members are returned!');
    console.log('   When searching for "Leo Hany", both "Leo Hany" and "Monica Atef"');
    console.log('   will appear in the dropdown because they share the same Family Group.');
  } else {
    console.log('\n❌ FAILED: Expected family members not found');
  }

  console.log('\n' + '='.repeat(50));
  console.log('Expected Behavior:');
  console.log('='.repeat(50));
  console.log('When a user searches for "Leo Hany":');
  console.log('  1. System finds "Leo Hany" (matches search)');
  console.log('  2. System identifies Family Group: "Leo Hany Family"');
  console.log('  3. System finds all guests in "Leo Hany Family"');
  console.log('  4. Dropdown shows:');
  console.log('     ┌─────────────────────────┐');
  console.log('     │ 👥 Leo Hany Family       │');
  console.log('     │ ☑️  Leo Hany            │');
  console.log('     │ ☐  Monica Atef          │');
  console.log('     └─────────────────────────┘');
  console.log('  5. User can select both family members');
  console.log('  6. Submit RSVP for both at once');
};

// Run the test
testFamilySearch();

