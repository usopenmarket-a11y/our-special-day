// Script to verify Supabase functions are deployed and working
const SUPABASE_URL = 'https://gosvleaijwscbrrnqkkt.supabase.co';

async function verifyDeployment() {
  console.log('🔍 Verifying Supabase Function Deployment...\n');
  console.log('='.repeat(70));

  // Test get-guests function
  console.log('\n📡 Testing get-guests function...');
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/get-guests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvc3ZsZWFpanNjc2Jycm5xa2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MjY0NDAsImV4cCI6MjA1MTUwMjQ0MH0.7qJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq',
      },
      body: JSON.stringify({ searchQuery: 'Sarah' }),
    });

    const status = response.status;
    const data = await response.json();

    console.log(`   Status: ${status}`);
    
    if (status === 503) {
      console.log('   ❌ Function failed to start (503 error)');
      console.log('   Error:', JSON.stringify(data, null, 2));
      console.log('\n   ⚠️  ACTION REQUIRED:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/get-guests/code');
      console.log('   2. Copy the ENTIRE file from: supabase/functions/get-guests/index.ts');
      console.log('   3. Paste and deploy');
      console.log('   4. Check logs for errors: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/logs/edge-functions');
    } else if (status === 200) {
      console.log('   ✅ Function is working!');
      console.log(`   Response structure:`);
      console.log(`     - Has guests: ${!!data.guests}`);
      console.log(`     - Guest count: ${data.guests?.length || 0}`);
      
      if (data.guests && data.guests.length > 0) {
        const guest = data.guests[0];
        console.log(`     - First guest structure:`);
        console.log(`       * Has englishName: ${!!guest.englishName} ${guest.englishName ? '✅' : '❌'}`);
        console.log(`       * Has arabicName: ${!!guest.arabicName} ${guest.arabicName ? '✅' : '⚠️'}`);
        console.log(`       * Has familyGroup: ${!!guest.familyGroup} ${guest.familyGroup ? '✅' : '⚠️'}`);
        console.log(`       * Has tableNumber: ${!!guest.tableNumber} ${guest.tableNumber ? '✅' : '⚠️'}`);
        console.log(`       * Has old 'name' field: ${!!guest.name} ${guest.name ? '❌ OLD FORMAT!' : '✅'}`);
        console.log(`     - Search language: ${data.searchLanguage || 'N/A'}`);
        
        if (guest.name && !guest.englishName) {
          console.log('\n   ⚠️  WARNING: Function is returning OLD format!');
          console.log('      Need to redeploy with updated code.');
        } else if (guest.englishName) {
          console.log('\n   ✅ Function is returning CORRECT format!');
        }
      }
    } else {
      console.log(`   ⚠️  Unexpected status: ${status}`);
      console.log('   Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.log('   ❌ Error testing function:', error.message);
  }

  // Test save-rsvp function (just check if it exists, don't actually save)
  console.log('\n📡 Testing save-rsvp function availability...');
  try {
    // Just check if function exists by calling it with invalid data
    const response = await fetch(`${SUPABASE_URL}/functions/v1/save-rsvp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvc3ZsZWFpanNjc2Jycm5xa2t0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MjY0NDAsImV4cCI6MjA1MTUwMjQ0MH0.7qJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq',
      },
      body: JSON.stringify({}), // Invalid - should return error but function should exist
    });

    const status = response.status;
    
    if (status === 503) {
      console.log('   ❌ Function failed to start (503 error)');
      console.log('\n   ⚠️  ACTION REQUIRED:');
      console.log('   1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/save-rsvp/code');
      console.log('   2. Copy the ENTIRE file from: supabase/functions/save-rsvp/index.ts');
      console.log('   3. Paste and deploy');
    } else if (status === 400 || status === 500) {
      console.log(`   ✅ Function exists (returned ${status} as expected for invalid request)`);
    } else if (status === 200) {
      console.log('   ✅ Function is working!');
    } else {
      console.log(`   ⚠️  Status: ${status}`);
    }
  } catch (error) {
    console.log('   ❌ Error testing function:', error.message);
  }

  console.log('\n' + '='.repeat(70));
  console.log('📋 Deployment Checklist:');
  console.log('='.repeat(70));
  console.log('\n1. get-guests function:');
  console.log('   URL: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/get-guests/code');
  console.log('   File: supabase/functions/get-guests/index.ts');
  console.log('   Status: Check above ⬆️');
  
  console.log('\n2. save-rsvp function:');
  console.log('   URL: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/functions/save-rsvp/code');
  console.log('   File: supabase/functions/save-rsvp/index.ts');
  console.log('   Status: Check above ⬆️');
  
  console.log('\n3. Environment Variables:');
  console.log('   Check: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/functions');
  console.log('   Required: GUEST_SHEET_ID = 13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs');
  
  console.log('\n4. After deployment, run: npm run test-api');
  console.log('='.repeat(70));
}

verifyDeployment().catch(console.error);

