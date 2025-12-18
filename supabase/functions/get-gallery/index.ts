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
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');

    if (!serviceAccountJson) {
      console.error('GOOGLE_SERVICE_ACCOUNT not configured');
      throw new Error('Google service account not configured');
    }

    if (!folderId) {
      console.error('No folderId provided');
      throw new Error('Folder ID is required');
    }

    // Parse service account JSON (stored as raw JSON string or base64)
    let sa: any;
    try {
      sa = JSON.parse(serviceAccountJson);
    } catch (_) {
      // try base64
      try {
        sa = JSON.parse(atob(serviceAccountJson));
      } catch (err) {
        console.error('Failed to parse service account JSON', err);
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT');
      }
    }

    console.log(`Fetching images from Google Drive folder: ${folderId}`);

    // Helper to create a short-lived access token using service account
    async function getAccessToken(sa: any) {
      const header = { alg: 'RS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      };

      const encode = (obj: any) => {
        const str = JSON.stringify(obj);
        const b64 = btoa(unescape(encodeURIComponent(str)));
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };

      const toSign = `${encode(header)}.${encode(claims)}`;

      // Convert PEM to ArrayBuffer
      const pem = sa.private_key as string;
      const pemClean = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s+/g, '');
      const pk = Uint8Array.from(atob(pemClean), c => c.charCodeAt(0));

      const key = await crypto.subtle.importKey('pkcs8', pk.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
      const signature = new Uint8Array(await crypto.subtle.sign({ name: 'RSASSA-PKCS1-v1_5' }, key, new TextEncoder().encode(toSign)));
      const sigB64 = btoa(String.fromCharCode(...signature)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const jwt = `${toSign}.${sigB64}`;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        throw new Error(`Failed to obtain access token: ${errText}`);
      }

      const tokenData = await tokenRes.json();
      return tokenData.access_token as string;
    }

    const accessToken = await getAccessToken(sa);

    // Query Google Drive API for images in the folder using OAuth access token
    const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`;
    const fields = 'files(id,name,mimeType,thumbnailLink,webContentLink,webViewLink)';
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`;

    const response = await fetch(driveUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

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
