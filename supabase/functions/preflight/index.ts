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

// Default IDs (match weddingConfig values)
const SHEET_ID = '13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs';
const GALLERY_FOLDER_ID = '1l4IlQOJ5z7tA-Nn3_T3zsJHVAzPRrE2D';
const UPLOAD_FOLDER_ID = '1uTizlj_-8c6KqODuWcIr8N4VscIwYJJL';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { sheetId, galleryFolderId, uploadFolderId } = (await req.json().catch(() => ({}))) as any;
    const sId = sheetId || SHEET_ID;
    const gId = galleryFolderId || GALLERY_FOLDER_ID;
    const uId = uploadFolderId || UPLOAD_FOLDER_ID;

    // Obtain token with both Sheets and Drive scopes
    const scopes = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly';
    const token = await getAccessToken(scopes);

    // 1) Read a small range from the sheet (A1:D5)
    const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sId}/values/Sheet1!A1:D5`;
    const sheetResp = await fetch(sheetUrl, { headers: { Authorization: `Bearer ${token}` } });
    const sheetOk = sheetResp.ok;
    const sheetBody = sheetOk ? await sheetResp.json() : { status: sheetResp.status, text: await sheetResp.text() };

    // 2) Try to write a test value to a temporary cell (we'll write to a far column to avoid collision)
    let writeOk = false;
    let writeResult: any = null;
    try {
      const now = new Date().toISOString();
      const testRange = `Sheet1!Z1:Z1`;
      const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sId}/values/${encodeURIComponent(testRange)}?valueInputOption=USER_ENTERED`;
      const wResp = await fetch(writeUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ range: testRange, majorDimension: 'ROWS', values: [[`preflight ${now}`]] }),
      });
      writeOk = wResp.ok;
      writeResult = writeOk ? await wResp.json() : { status: wResp.status, text: await wResp.text() };
    } catch (wErr) {
      writeOk = false;
      writeResult = String(wErr);
    }

    // 3) List files in gallery folder (metadata only)
    const query = `'${gId}' in parents and trashed=false`;
    const fields = 'files(id,name, mimeType)';
    const driveUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=5`;
    const driveResp = await fetch(driveUrl, { headers: { Authorization: `Bearer ${token}` } });
    const driveOk = driveResp.ok;
    const driveBody = driveOk ? await driveResp.json() : { status: driveResp.status, text: await driveResp.text() };

    return new Response(JSON.stringify({
      ok: true,
      sheet: { ok: sheetOk, body: sheetBody },
      writeTest: { ok: writeOk, result: writeResult },
      drive: { ok: driveOk, body: driveBody },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ ok: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
