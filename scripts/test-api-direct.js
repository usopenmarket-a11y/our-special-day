// Direct API test to verify the get-guests function is working
const SUPABASE_URL = 'https://gosvleaijwscbrrnqkkt.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvc3ZsZWFpanNjc2Jycm5xa2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MjY0NDAsImV4cCI6MjA1MTUwMjQ0MH0.7qJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq';

async function testAPIDirect() {
  console.log('🔍 Testing get-guests API directly...\n');

  // Test 1: Search for "Sarah abdelrahman"
  console.log('='.repeat(60));
  console.log('TEST 1: Search for "Sarah abdelrahman"');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ searchQuery: 'Sarah abdelrahman' }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.guests && data.guests.length > 0) {
      console.log(`\n✅ Found ${data.guests.length} guest(s):`);
      data.guests.forEach((guest, i) => {
        console.log(`\n  Guest ${i + 1}:`);
        console.log(`    englishName: "${guest.englishName || 'MISSING'}"`);
        console.log(`    arabicName: "${guest.arabicName || 'MISSING'}"`);
        console.log(`    familyGroup: "${guest.familyGroup || 'MISSING'}"`);
        console.log(`    tableNumber: "${guest.tableNumber || 'MISSING'}"`);
        console.log(`    rowIndex: ${guest.rowIndex}`);
        
        // Check for old format
        if (guest.name) {
          console.log(`    ⚠️  WARNING: Old format detected! Found 'name' instead of 'englishName'`);
        }
      });
      console.log(`\n  Search Language: ${data.searchLanguage || 'N/A'}`);
    } else {
      console.log('❌ No guests found in response');
    }

  } catch (error) {
    console.error('❌ Error calling API:', error.message);
  }

  // Test 2: Search for Arabic name
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Search for "سارة عبد الرحمان"');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ searchQuery: 'سارة عبد الرحمان' }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response:');
    console.log(JSON.stringify(data, null, 2));

    if (data.guests && data.guests.length > 0) {
      console.log(`\n✅ Found ${data.guests.length} guest(s):`);
      data.guests.forEach((guest, i) => {
        console.log(`\n  Guest ${i + 1}:`);
        console.log(`    englishName: "${guest.englishName || 'MISSING'}"`);
        console.log(`    arabicName: "${guest.arabicName || 'MISSING'}"`);
        console.log(`    familyGroup: "${guest.familyGroup || 'MISSING'}"`);
        console.log(`    tableNumber: "${guest.tableNumber || 'MISSING'}"`);
      });
      console.log(`\n  Search Language: ${data.searchLanguage || 'N/A'}`);
    } else {
      console.log('❌ No guests found in response');
    }

  } catch (error) {
    console.error('❌ Error calling API:', error.message);
  }

  // Test 3: Search for "Hossni"
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Search for "Hossni" (should find family members)');
  console.log('='.repeat(60));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ searchQuery: 'Hossni' }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`   Response: ${errorText}`);
      return;
    }

    const data = await response.json();
    
    if (data.guests && data.guests.length > 0) {
      console.log(`✅ Found ${data.guests.length} guest(s) (should include both Sarah and Hossni):`);
      data.guests.forEach((guest, i) => {
        console.log(`  ${i + 1}. ${guest.englishName || 'N/A'} (Family: ${guest.familyGroup || 'N/A'})`);
      });
      
      const hasSarah = data.guests.some(g => g.englishName?.toLowerCase().includes('sarah'));
      const hasHossni = data.guests.some(g => g.englishName?.toLowerCase().includes('hossni'));
      
      console.log(`\n  Family Group Test:`);
      console.log(`    Sarah found: ${hasSarah ? '✅' : '❌'}`);
      console.log(`    Hossni found: ${hasHossni ? '✅' : '❌'}`);
      
      if (hasSarah && hasHossni) {
        console.log(`\n  ✅ SUCCESS: Both family members found!`);
      } else {
        console.log(`\n  ⚠️  Family grouping might not be working correctly`);
      }
    } else {
      console.log('❌ No guests found in response');
    }

  } catch (error) {
    console.error('❌ Error calling API:', error.message);
  }
}

testAPIDirect().catch(console.error);

