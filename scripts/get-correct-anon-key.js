// Script to help get the correct anon key
const PROJECT_REF = 'gosvleaijwscbrrnqkkt';

console.log('📋 To get the correct anon key:\n');
console.log('1. Go to: https://supabase.com/dashboard/project/gosvleaijwscbrrnqkkt/settings/api');
console.log('2. Scroll to "Project API keys" section');
console.log('3. Find "anon public" key');
console.log('4. Copy it\n');

console.log('🔧 After you get the key, update .env file:');
console.log('   VITE_SUPABASE_PUBLISHABLE_KEY=your_correct_key_here\n');

console.log('✅ Then verify with: node scripts/verify-jwt.js');
console.log('✅ Then restart dev server\n');

console.log('💡 Or try: supabase projects api-keys --project-ref gosvleaijwscbrrnqkkt\n');

