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
    const { folderId } = await req.json();
    const apiKey = Deno.env.get('GOOGLE_API_KEY');

    if (!apiKey) {
      console.error('GOOGLE_API_KEY not configured');
      throw new Error('Google API key not configured');
    }

    if (!folderId) {
      console.error('No folderId provided');
      throw new Error('Folder ID is required');
    }

    console.log(`Fetching images from Google Drive folder: ${folderId}`);

    // Query Google Drive API for images in the folder
    const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`;
    const fields = 'files(id,name,mimeType,thumbnailLink,webContentLink)';
    
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&key=${apiKey}`;
    
    const response = await fetch(driveUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Drive API error:', errorText);
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.files?.length || 0} images`);

    // Transform the response to include direct image URLs
    const images = (data.files || []).map((file: any, index: number) => ({
      id: file.id,
      name: file.name,
      // Use Google Drive thumbnail with larger size
      url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
      // Full size image URL
      fullUrl: `https://drive.google.com/uc?export=view&id=${file.id}`,
      alt: file.name || `Gallery image ${index + 1}`,
    }));

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage, images: [] }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});