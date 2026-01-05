// Minimal test version to verify function starts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const searchQuery = body?.searchQuery || '';

    // Minimal response to test if function works
    return new Response(
      JSON.stringify({ 
        guests: [
          {
            englishName: "Sarah abdelrahman",
            arabicName: "سارة عبد الرحمان",
            rowIndex: 0,
            familyGroup: "Sarah And Hossni's Family",
            tableNumber: "1"
          },
          {
            englishName: "Hossni",
            arabicName: "حسني",
            rowIndex: 1,
            familyGroup: "Sarah And Hossni's Family",
            tableNumber: "2"
          }
        ],
        searchLanguage: /[\u0600-\u06FF]/.test(searchQuery) ? 'ar' : 'en',
        rateLimit: {
          remaining: 4,
          limit: 5
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message, guests: [] }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

