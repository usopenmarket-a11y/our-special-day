import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchQuery } = await req.json();
    
    // Get sheet ID from environment variable (stored in Supabase secrets)
    const sheetId = Deno.env.get('GUEST_SHEET_ID') || "13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs";
    
    // Fetch the sheet as CSV (publicly accessible)
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    
    console.log("Fetching guest list from Google Sheets...");
    
    const response = await fetch(csvUrl);
    
    if (!response.ok) {
      console.error("Failed to fetch sheet:", response.status, response.statusText);
      throw new Error(`Failed to fetch sheet: ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log("CSV fetched successfully, parsing...");
    
    // Parse CSV - Google Sheets column structure:
    // Column A (index 0): Name
    // Column B (index 1): Family Group
    // Column C (index 2): Confirmation (not read here)
    // Column D (index 3): Date (not read here)
    // Column E (index 4): Time (not read here)
    
    // Handle different line endings and normalize
    const normalizedCsv = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedCsv.split('\n').filter(line => line.trim().length > 0);
    const guests: { name: string; rowIndex: number; familyGroup?: string }[] = [];
    
    console.log(`Total lines in CSV (after normalization): ${lines.length}`);
    
    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (line && line.trim()) {
        // Parse CSV columns (handle quoted values with commas)
        const columns = parseCSVLine(line);
        // Clean and trim each column, removing quotes and whitespace
        const name = columns[0]?.replace(/^"+|"+$/g, '').trim(); // Column A: Name
        const familyGroup = (columns[1]?.replace(/^"+|"+$/g, '').trim() || '').replace(/\s+$/, ''); // Column B: Family Group (remove trailing spaces)
        
        // Debug: Log rows containing "Leo" or "Monica" to verify parsing
        if (name && (name.toLowerCase().includes('leo') || name.toLowerCase().includes('monica'))) {
          console.log(`Row ${i}: Name="${name}", FamilyGroup="${familyGroup}", RawCol1="${columns[1]}"`);
        }
        
        if (name && name.length > 0) {
          guests.push({ 
            name, 
            rowIndex: i - 1, // rowIndex is 0-based (excluding header), used to write back to correct row
            familyGroup: familyGroup && familyGroup.length > 0 ? familyGroup : undefined
          });
        }
      }
    }
    
    console.log(`Found ${guests.length} guests`);
    
    // Filter by search query and include family members
    let filteredGuests = guests;
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      // First, find all guests matching the search query
      const matchingGuests = guests.filter(guest => 
        guest.name.toLowerCase().includes(query)
      );
      
      console.log(`Search query: "${searchQuery}" - Found ${matchingGuests.length} matching guests`);
      matchingGuests.forEach(g => {
        console.log(`  - ${g.name} (Family: ${g.familyGroup || 'None'})`);
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
        console.log(`  - ${g.name} (Family: ${g.familyGroup})`);
      });
      
      // Combine matching guests and related family members, remove duplicates
      // Use rowIndex as key to handle cases where multiple guests might have the same name
      const allRelatedGuests = new Map<number, { name: string; rowIndex: number; familyGroup?: string }>();
      
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
    
    return new Response(
      JSON.stringify({ guests: filteredGuests }),
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
  
  // Ensure we have at least 2 columns (Name and Family Group)
  // If Family Group is missing, add empty string
  while (result.length < 2) {
    result.push('');
  }
  
  return result;
}