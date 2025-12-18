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
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');

    if (!serviceAccountJson) {
      console.error('GOOGLE_SERVICE_ACCOUNT not configured');
      throw new Error('Google service account not configured');
    }

    if (!file) {
      console.error('No file provided');
      throw new Error('File is required');
    }

    if (!folderId) {
      console.error('No folderId provided');
      throw new Error('Folder ID is required');
    }

    // Parse service account JSON (raw or base64)
    let sa: any;
    try {
      sa = JSON.parse(serviceAccountJson);
    } catch (_) {
      try {
        sa = JSON.parse(atob(serviceAccountJson));
      } catch (err) {
        console.error('Failed to parse service account JSON', err);
        throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT');
      }
    }

    // Helper: obtain OAuth access token from service account
    async function getAccessToken(sa: any) {
      const header = { alg: 'RS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/drive.file',
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

    console.log(`Uploading file: ${file.name} to folder: ${folderId}`);

    // Prepare multipart/related body: metadata + media
    const boundary = '-------' + Math.random().toString(36).slice(2);
    const metadata = { name: file.name, parents: [folderId] };
    const part1 = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
    const part2Header = `--${boundary}\r\nContent-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;
    const closing = `\r\n--${boundary}--`;

    const fileArray = await file.arrayBuffer();
    const blob = new Blob([part1, part2Header, new Uint8Array(fileArray), closing]);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: blob,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Upload failed:', errText);
      throw new Error(`Upload failed: ${uploadRes.status}`);
    }

    const uploaded = await uploadRes.json();
    console.log('Upload successful:', uploaded);

    return new Response(JSON.stringify({
      success: true,
      message: 'Photo uploaded successfully',
      fileId: uploaded.id,
      fileName: uploaded.name,
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
