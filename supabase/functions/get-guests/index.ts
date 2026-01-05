import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: 5 searches per day per IP
const MAX_SEARCHES_PER_DAY = 5;
const searchCounts = new Map<string, { count: number; date: string }>();

function getClientIdentifier(req: Request): string {
  // Try to get IP from various headers (for different proxy setups)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  
  const ip = forwarded?.split(',')[0]?.trim() || 
             realIp || 
             cfConnectingIp || 
             'unknown';
  
  return ip;
}

function canSearch(identifier: string): { allowed: boolean; remaining: number } {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const record = searchCounts.get(identifier);
  
  if (!record || record.date !== today) {
    // New day or new identifier
    searchCounts.set(identifier, { count: 0, date: today });
    return { allowed: true, remaining: MAX_SEARCHES_PER_DAY };
  }
  
  if (record.count >= MAX_SEARCHES_PER_DAY) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: MAX_SEARCHES_PER_DAY - record.count };
}

function incrementSearchCount(identifier: string): number {
  const today = new Date().toISOString().split('T')[0];
  const record = searchCounts.get(identifier);
  
  if (!record || record.date !== today) {
    searchCounts.set(identifier, { count: 1, date: today });
    return 1;
  }
  
  const newCount = record.count + 1;
  searchCounts.set(identifier, { count: newCount, date: today });
  return newCount;
}

// Clean up old records periodically (keep only today's records)
function cleanupOldRecords() {
  const today = new Date().toISOString().split('T')[0];
  for (const [key, value] of searchCounts.entries()) {
    if (value.date !== today) {
      searchCounts.delete(key);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Clean up old records
    cleanupOldRecords();
    
    // Check rate limit
    const identifier = getClientIdentifier(req);
    const rateLimit = canSearch(identifier);
    
    if (!rateLimit.allowed) {
      console.log(`Rate limit exceeded for ${identifier}`);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          rateLimited: true,
          message: `You have reached the daily search limit of ${MAX_SEARCHES_PER_DAY} searches. Please try again tomorrow.`,
          remaining: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429 // Too Many Requests
        }
      );
    }
    
    // Parse request body safely
    let searchQuery = '';
    try {
      const body = await req.json();
      searchQuery = body?.searchQuery || '';
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(
        JSON.stringify({ error: 'Invalid request body', guests: [] }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Increment search count
    const searchCount = incrementSearchCount(identifier);
    console.log(`Search ${searchCount}/${MAX_SEARCHES_PER_DAY} for ${identifier}`);
    
    // Get sheet ID from environment variable (stored in Supabase secrets)
    const sheetId = Deno.env.get('GUEST_SHEET_ID') || "13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs";
    
    // Fetch the sheet as CSV (publicly accessible)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
    
    console.log("Fetching guest list from Google Sheets...");
    console.log(`   Sheet ID: ${sheetId}`);
    console.log(`   CSV URL: ${csvUrl}`);
    
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      console.error("Failed to fetch sheet:", response.status, response.statusText);
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log("CSV fetched successfully, parsing...");
    console.log(`   CSV length: ${csvText.length} characters`);
    console.log(`   First 500 chars: ${csvText.substring(0, 500)}`);
    
    // Parse CSV - Google Sheets column structure:
    // Column A (index 0): English Name
    // Column B (index 1): Arabic Name
    // Column C (index 2): Family Group
    // Column D (index 3): Confirmation (not read here)
    // Column E (index 4): Table number (not read here)
    // Column F (index 5): Date (not read here)
    // Column G (index 6): Time (not read here)
    
    // Handle different line endings and normalize
    const normalizedCsv = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedCsv.split('\n').filter(line => line.trim().length > 0);
    const guests: { englishName: string; arabicName?: string; rowIndex: number; familyGroup?: string; tableNumber?: string }[] = [];
    
    console.log(`Total lines in CSV (after normalization): ${lines.length}`);
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.trim()) {
        // Parse CSV columns (handle quoted values with commas)
        const columns = parseCSVLine(line);
        
        // Log first few rows for debugging
        if (i <= 3) {
          console.log(`Row ${i} raw columns (${columns.length}):`, columns.map((c, idx) => `[${idx}]="${c}"`).join(', '));
        }
        
        // Clean and trim each column, removing quotes and whitespace
        // Column structure: A=English Name, B=Arabic Name, C=Family Group, D=Confirmation, E=Table number, F=Date, G=Time
        const englishName = columns[0]?.replace(/^"+|"+$/g, '').trim() || ''; // Column A (index 0): English Name
        const arabicName = columns[1]?.replace(/^"+|"+$/g, '').trim() || ''; // Column B (index 1): Arabic Name
        const familyGroup = (columns[2]?.replace(/^"+|"+$/g, '').trim() || '').replace(/\s+$/, ''); // Column C (index 2): Family Group
        const tableNumber = columns[4]?.replace(/^"+|"+$/g, '').trim() || ''; // Column E (index 4): Table number
        
        // Validate column mapping
        if (i === 2 && englishName.toLowerCase().includes('sarah')) {
          console.log(`   ✅ Column mapping verified for Sarah:`);
          console.log(`      [0] English Name: "${englishName}"`);
          console.log(`      [1] Arabic Name: "${arabicName}"`);
          console.log(`      [2] Family Group: "${familyGroup}"`);
          console.log(`      [4] Table Number: "${tableNumber}"`);
        }
        
        // Debug: Log rows containing specific names to verify parsing
        if (englishName && (
          englishName.toLowerCase().includes('leo') || 
          englishName.toLowerCase().includes('monica') ||
          englishName.toLowerCase().includes('sarah') ||
          englishName.toLowerCase().includes('hossni')
        )) {
          console.log(`Row ${i}: EnglishName="${englishName}", ArabicName="${arabicName}", FamilyGroup="${familyGroup}", TableNumber="${tableNumber}"`);
          console.log(`   Raw columns: [0]="${columns[0] || ''}", [1]="${columns[1] || ''}", [2]="${columns[2] || ''}", [3]="${columns[3] || ''}", [4]="${columns[4] || ''}", [5]="${columns[5] || ''}", [6]="${columns[6] || ''}"`);
          console.log(`   Column count: ${columns.length}`);
        }
        
        if (englishName && englishName.length > 0) {
          guests.push({ 
            englishName, 
            arabicName: arabicName && arabicName.length > 0 ? arabicName : undefined,
            rowIndex: i - 1, // rowIndex is 0-based (excluding header), used to write back to correct row
            familyGroup: familyGroup && familyGroup.length > 0 ? familyGroup : undefined,
            tableNumber: tableNumber && tableNumber.length > 0 ? tableNumber : undefined
          });
        }
      }
    }
    
    console.log(`Found ${guests.length} guests`);
    
    // Filter by search query and include family members
    // Ensure searchQuery is a string
    const searchQueryStr = typeof searchQuery === 'string' ? searchQuery : String(searchQuery || '');
    
    // Detect if search query contains Arabic characters
    const hasArabicChars = /[\u0600-\u06FF]/.test(searchQueryStr);
    
    let filteredGuests = guests;
    if (searchQueryStr && searchQueryStr.trim()) {
      const query = searchQueryStr.toLowerCase().trim();
      
      // First, find all guests matching the search query in either English or Arabic name
      const matchingGuests = guests.filter(guest => {
        const matchesEnglish = guest.englishName.toLowerCase().includes(query);
        const matchesArabic = guest.arabicName?.toLowerCase().includes(query) || false;
        return matchesEnglish || matchesArabic;
      });
      
      console.log(`Search query: "${searchQueryStr}" (Arabic: ${hasArabicChars}) - Found ${matchingGuests.length} matching guests`);
      matchingGuests.forEach(g => {
        console.log(`  - ${g.englishName}${g.arabicName ? ` / ${g.arabicName}` : ''} (Family: ${g.familyGroup || 'None'})`);
      });
      
      // Collect all unique family groups from matching guests (case-sensitive exact match)
      const familyGroups = new Set<string>();
      matchingGuests.forEach(guest => {
        if (guest.familyGroup && guest.familyGroup.trim().length > 0) {
          familyGroups.add(guest.familyGroup.trim());
        }
      });
      
      console.log(`Found ${familyGroups.size} unique family group(s):`, Array.from(familyGroups));
      
      // Find all guests in the same family groups (exact match, case-sensitive)
      const relatedGuests = guests.filter(guest => 
        guest.familyGroup && 
        guest.familyGroup.trim().length > 0 &&
        familyGroups.has(guest.familyGroup.trim())
      );
      
      console.log(`Found ${relatedGuests.length} related family members`);
      relatedGuests.forEach(g => {
        console.log(`  - ${g.englishName}${g.arabicName ? ` / ${g.arabicName}` : ''} (Family: ${g.familyGroup})`);
      });
      
      // Combine matching guests and related family members, remove duplicates
      // Use rowIndex as key to handle cases where multiple guests might have the same name
      const allRelatedGuests = new Map<number, { englishName: string; arabicName?: string; rowIndex: number; familyGroup?: string; tableNumber?: string }>();
      
      // Add matching guests
      matchingGuests.forEach(guest => {
        allRelatedGuests.set(guest.rowIndex, guest);
      });
      
      // Add related family members
      relatedGuests.forEach(guest => {
        allRelatedGuests.set(guest.rowIndex, guest);
      });
      
      filteredGuests = Array.from(allRelatedGuests.values());
      
      console.log(`Total guests to return: ${filteredGuests.length} (${matchingGuests.length} matching + ${relatedGuests.length} family members)`);
    }
    
    // Add search language detection to response (recalculate to be safe)
    const finalHasArabicChars = /[\u0600-\u06FF]/.test(searchQueryStr || '');
    
    console.log(`Returning ${filteredGuests.length} guests, searchLanguage: ${finalHasArabicChars ? 'ar' : 'en'}`);
    
    return new Response(
      JSON.stringify({ 
        guests: filteredGuests,
        searchLanguage: finalHasArabicChars ? 'ar' : 'en', // Indicate if search was in Arabic
        rateLimit: {
          remaining: rateLimit.remaining - 1, // Subtract 1 for this search
          limit: MAX_SEARCHES_PER_DAY
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in get-guests function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage, guests: [] }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to parse CSV line (handles quoted values with commas)
// Google Sheets CSV format: values may be quoted, empty cells are just commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Handle escaped quotes ("")
      if (i + 1 < line.length && line[i + 1] === '"' && inQuotes) {
        current += '"';
        i++; // Skip next quote
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
  
  // Push the last column
  result.push(current);
  
  // Ensure we have at least 7 columns (A-G: English Name, Arabic Name, Family Group, Confirmation, Table number, Date, Time)
  // If columns are missing, add empty strings
  while (result.length < 7) {
    result.push('');
  }
  
  return result;
}