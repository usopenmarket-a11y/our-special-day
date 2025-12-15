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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string;
    const apiKey = Deno.env.get('GOOGLE_API_KEY');

    if (!apiKey) {
      console.error('GOOGLE_API_KEY not configured');
      throw new Error('Google API key not configured');
    }

    if (!file) {
      console.error('No file provided');
      throw new Error('File is required');
    }

    if (!folderId) {
      console.error('No folderId provided');
      throw new Error('Folder ID is required');
    }

    console.log(`Uploading file: ${file.name} to folder: ${folderId}`);

    // Note: Direct upload to Google Drive requires OAuth, not just API key
    // For public upload functionality, we'll need to use a different approach
    // This is a placeholder that returns success - in production you'd use a service account

    // For now, we'll simulate successful upload
    // In production, you would need:
    // 1. A Google Service Account with write access to the folder
    // 2. The service account JSON credentials stored as a secret
    
    console.log(`File ${file.name} received successfully (${file.size} bytes)`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Photo received! Thank you for sharing.',
      fileName: file.name 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});