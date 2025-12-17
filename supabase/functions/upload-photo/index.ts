import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get access token using OAuth refresh token (uses YOUR Google account quota)
async function getAccessToken(): Promise<string> {
  // IMPORTANT: trim to avoid hidden whitespace/newlines in secrets
  const clientId = (Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '').trim();
  const clientSecret = (Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '').trim();
  const refreshToken = (Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN') ?? '').trim();

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'Missing OAuth credentials: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, or GOOGLE_OAUTH_REFRESH_TOKEN'
    );
  }

  console.log(
    `Refreshing OAuth access token... (clientIdLen=${clientId.length}, refreshTokenLen=${refreshToken.length})`
  );

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  }).toString();

  // Google sometimes returns {"error":"internal_failure"} transiently.
  // We retry once and also try the legacy endpoint.
  const endpoints = ['https://oauth2.googleapis.com/token', 'https://www.googleapis.com/oauth2/v4/token'];

  let lastErrorText = '';

  for (const tokenUrl of endpoints) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const resp = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Helpful for debugging/consistency; does not leak secrets.
          'User-Agent': 'lovable-upload-photo/1.0',
        },
        body,
      });

      const txt = await resp.text();

      if (resp.ok) {
        const data = JSON.parse(txt);
        if (!data?.access_token) throw new Error('Token endpoint response missing access_token');
        console.log('OAuth token refreshed successfully');
        return data.access_token as string;
      }

      lastErrorText = txt;
      console.error(`OAuth token refresh failed (${resp.status}) via ${tokenUrl}:`, txt);

      const isInternalFailure = txt.includes('internal_failure');
      if (isInternalFailure && attempt === 0) {
        // short backoff then retry once
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }

      break;
    }
  }

  throw new Error(`Failed to refresh access token: ${lastErrorText || 'unknown_error'}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    let fileName: string | undefined;
    let mimeType: string | undefined;
    let fileBuffer: Uint8Array | undefined;
    let folderId = Deno.env.get('UPLOAD_FOLDER_ID');

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      folderId = (formData.get('folderId') as string) || folderId;
      if (!file) throw new Error('File is required (multipart)');
      fileName = file.name;
      mimeType = file.type || 'application/octet-stream';
      const ab = await file.arrayBuffer();
      fileBuffer = new Uint8Array(ab);
    } else {
      const json = await req.json();
      const { fileName: fn, mimeType: mt, base64, folderId: fid } = json || {};
      if (!base64 || !fn) throw new Error('Expected JSON payload { fileName, base64, mimeType?, folderId? }');
      fileName = fn;
      mimeType = mt || 'application/octet-stream';
      folderId = fid || folderId;
      const raw = atob(base64);
      const arr = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
      fileBuffer = arr;
    }

    if (!fileBuffer) throw new Error('No file data found');
    if (!folderId) throw new Error('folderId is required');

    console.log(`Uploading file: ${fileName} to folder: ${folderId}`);

    const token = await getAccessToken();

    const boundary = '-------314159265358979323846';
    const metadata = { name: fileName, parents: [folderId] };
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const base64Data = btoa(String.fromCharCode(...fileBuffer));
    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${mimeType}\r\n` +
      'Content-Transfer-Encoding: base64\r\n\r\n' +
      base64Data +
      closeDelimiter;

    const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
    const uploadResp = await fetch(uploadUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartRequestBody,
    });

    if (!uploadResp.ok) {
      const errorText = await uploadResp.text();
      console.error('Drive upload error:', errorText);
      const snippet = errorText.length > 1200 ? `${errorText.slice(0, 1200)}…` : errorText;
      throw new Error(`Drive upload failed (${uploadResp.status}): ${snippet}`);
    }

    const result = await uploadResp.json();
    console.log('File uploaded:', result.id);

    // Set public permission
    try {
      const permResp = await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: 'reader', type: 'anyone' }),
      });
      if (!permResp.ok) {
        const err = await permResp.text();
        console.warn('Could not set public permission:', err);
      }
    } catch (permErr) {
      console.warn('Permission setting error:', permErr);
    }

    const fullUrl = `https://drive.google.com/uc?export=view&id=${result.id}`;

    return new Response(JSON.stringify({ success: true, id: result.id, name: result.name, url: fullUrl }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error uploading photo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
