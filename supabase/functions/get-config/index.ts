import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Get IDs from environment variables (stored in Supabase secrets)
    // These should be set in Supabase Dashboard → Project Settings → Edge Functions → Secrets
    const config = {
      guestSheetId: Deno.env.get('GUEST_SHEET_ID') || '',
      uploadFolderId: Deno.env.get('UPLOAD_FOLDER_ID') || '',
      galleryFolderId: Deno.env.get('GALLERY_FOLDER_ID') || '',
    };

    // Return config without exposing any secrets or sensitive data
    return new Response(JSON.stringify(config), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

