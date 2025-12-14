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
    
    // Google Sheets ID from the wedding config
    const sheetId = "13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs";
    
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
    
    // Parse CSV - first column contains guest names
    const lines = csvText.split('\n');
    const guests: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        // Get the first column (name)
        const columns = line.split(',');
        const name = columns[0]?.replace(/"/g, '').trim();
        if (name && name.length > 0) {
          guests.push(name);
        }
      }
    }
    
    console.log(`Found ${guests.length} guests`);
    
    // Filter by search query if provided
    let filteredGuests = guests;
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredGuests = guests.filter(guest => 
        guest.toLowerCase().includes(query)
      );
      console.log(`Filtered to ${filteredGuests.length} guests matching "${searchQuery}"`);
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
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
