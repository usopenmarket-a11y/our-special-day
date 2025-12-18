import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get access token for Google APIs.
// For UPLOADS: Prefer OAuth refresh token (uses YOUR Google account quota).
// Service Accounts don't have storage quota for regular Drive folders.
async function getAccessToken(scopes: string): Promise<string> {
  // --- 1) OAuth refresh-token flow (preferred for uploads - uses user's quota)
  const clientId = (Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '').trim();
  const clientSecret = (Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '').trim();
  const refreshToken = (Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN') ?? '').trim();

  if (clientId && clientSecret && refreshToken) {
    console.log(
      `Refreshing OAuth access token... (clientIdLen=${clientId.length}, refreshTokenLen=${refreshToken.length})`
    );

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }).toString();

    const endpoints = ['https://oauth2.googleapis.com/token', 'https://www.googleapis.com/oauth2/v4/token'];
    let lastErrorText = '';

    for (const tokenUrl of endpoints) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const resp = await fetch(tokenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
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
          await new Promise((r) => setTimeout(r, 800));
          continue;
        }

        break;
      }
    }

    throw new Error(`Failed to refresh access token: ${lastErrorText || 'unknown_error'}`);
  }

  // --- 2) Service Account fallback (only works with Shared Drives, not regular folders)
  const serviceAccountJson = (Deno.env.get('SERVICE_ACCOUNT_JSON') ?? '').trim();
  if (serviceAccountJson) {
    console.log('Using Service Account authentication (note: only works with Shared Drives)');
    let serviceAccount: any;
    try {
      serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
      const cleaned = serviceAccountJson.replace(/\\n/g, '\n').replace(/\\/g, '');
      serviceAccount = JSON.parse(cleaned);
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      scope: scopes,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const encode = (obj: object) =>
      btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const unsignedToken = `${encode(header)}.${encode(payload)}`;

    const pemContents = (serviceAccount.private_key as string)
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');

    const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      new TextEncoder().encode(unsignedToken)
    );

    const signedToken =
      `${unsignedToken}.` +
      btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(signedToken)}`,
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
    return tokenData.access_token as string;
  }

  throw new Error(
    'Missing credentials: need GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET + GOOGLE_OAUTH_REFRESH_TOKEN'
  );
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

    const token = await getAccessToken('https://www.googleapis.com/auth/drive');

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
