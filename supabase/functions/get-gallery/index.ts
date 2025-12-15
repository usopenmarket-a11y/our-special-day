import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(scopes: string) {
  let saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || Deno.env.get('SERVICE_ACCOUNT_JSON');
  const saJsonB64 = Deno.env.get('SERVICE_ACCOUNT_JSON_B64');
  if (!saJson && saJsonB64) {
    try {
      saJson = atob(saJsonB64);
    } catch (err) {
      throw new Error('Failed to decode SERVICE_ACCOUNT_JSON_B64');
    }
  }
  if (!saJson) throw new Error('SERVICE_ACCOUNT_JSON (or SERVICE_ACCOUNT_JSON_B64) not configured');

  let sa;
  try {
    sa = JSON.parse(saJson);
  } catch (err) {
    throw new Error('Invalid SERVICE_ACCOUNT_JSON content');
  }
  const privateKeyPem = sa.private_key as string;
  const clientEmail = sa.client_email as string;
  if (!privateKeyPem || !clientEmail) throw new Error('Invalid service account JSON');

  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: scopes,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const toBase64Url = (obj: any) => {
    const s = JSON.stringify(obj);
    const b = new TextEncoder().encode(s);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(b)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const headerB64 = toBase64Url(header);
  const payloadB64 = toBase64Url(payload);
  const unsigned = `${headerB64}.${payloadB64}`;

  const pem = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const derStr = atob(pem);
  const der = new Uint8Array(derStr.split('').map((c) => c.charCodeAt(0))).buffer;

  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const sigBytes = new Uint8Array(signature);
  let sigBase64 = '';
  for (let i = 0; i < sigBytes.length; i++) sigBase64 += String.fromCharCode(sigBytes[i]);
  sigBase64 = btoa(sigBase64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${unsigned}.${sigBase64}`;
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Failed to obtain access token: ${txt}`);
  }

  const data = await resp.json();
  return data.access_token as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { folderId } = await req.json();
    if (!folderId) throw new Error('folderId is required');

    console.log(`Fetching images from Google Drive folder: ${folderId}`);

    const scopes = 'https://www.googleapis.com/auth/drive.readonly';
    const token = await getAccessToken(scopes);

    const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`;
    const fields = 'files(id,name,mimeType,thumbnailLink,webViewLink,webContentLink)';
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`;

    const response = await fetch(driveUrl, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Drive API error:', errorText);
      throw new Error(`Google Drive API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.files?.length || 0} images`);

    const images = (data.files || []).map((file: any, index: number) => ({
      id: file.id,
      name: file.name,
      url: `https://drive.google.com/thumbnail?id=${file.id}&sz=w800`,
      fullUrl: file.webContentLink || `https://drive.google.com/uc?export=view&id=${file.id}`,
      alt: file.name || `Gallery image ${index + 1}`,
    }));

    return new Response(JSON.stringify({ images }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error fetching gallery:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage, images: [] }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});