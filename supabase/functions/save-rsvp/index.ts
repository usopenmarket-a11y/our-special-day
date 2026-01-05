import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: create/get OAuth2 access token using service account JSON stored in env
async function getAccessToken(scopes: string) {
  let saJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') || Deno.env.get('SERVICE_ACCOUNT_JSON');
  const saJsonB64 = Deno.env.get('SERVICE_ACCOUNT_JSON_B64');

  if (!saJson && saJsonB64) {
    try {
      saJson = atob(saJsonB64);
    } catch {
      throw new Error('Failed to decode SERVICE_ACCOUNT_JSON_B64');
    }
  }

  if (!saJson) {
    throw new Error('SERVICE_ACCOUNT_JSON (or SERVICE_ACCOUNT_JSON_B64) not configured');
  }

  const normalizeServiceAccountJson = (raw: string) => {
    const trimmed = raw.trim();

    // If base64 was pasted into SERVICE_ACCOUNT_JSON by mistake, try decoding it.
    if (!trimmed.startsWith('{')) {
      try {
        const decoded = atob(trimmed);
        if (decoded.trim().startsWith('{')) return decoded.trim();
      } catch {
        // ignore
      }
    }

    // Fix common issue: private_key pasted with real newlines (invalid JSON)
    if (trimmed.includes('"private_key"') && trimmed.includes('-----BEGIN PRIVATE KEY-----')) {
      return trimmed.replace(
        /("private_key"\s*:\s*")([\s\S]*?)(")/,
        (_m, p1, val, p3) => `${p1}${String(val).replace(/\r?\n/g, '\\n')}${p3}`
      );
    }

    return trimmed;
  };

  const normalized = normalizeServiceAccountJson(saJson);
  console.log(
    `Service account secret loaded (len=${normalized.length}, startsWithBrace=${normalized.trim().startsWith('{')})`
  );

  let sa: any;
  try {
    sa = JSON.parse(normalized);
  } catch {
    throw new Error(
      'Invalid SERVICE_ACCOUNT_JSON content. Paste the full JSON key exactly as downloaded, or set SERVICE_ACCOUNT_JSON_B64 to a base64-encoded JSON.'
    );
  }

  const privateKeyPem = sa.private_key as string;
  const clientEmail = sa.client_email as string;
  if (!privateKeyPem || !clientEmail) throw new Error('Invalid service account JSON');

  // create JWT
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

  // import PEM private key
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

  // Exchange JWT for access token
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
    const body = await req.json();
    
    // Support both single guest (backward compatible) and multiple guests
    const guests = body.guests || (body.guestName ? [{ englishName: body.guestName || body.name, rowIndex: body.rowIndex }] : []);
    const attending = body.attending;
    
    // Get sheet ID from environment variable (stored in Supabase secrets)
    const sheetId = Deno.env.get('GUEST_SHEET_ID') || '13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs';

    if (!guests || guests.length === 0) throw new Error('guests array or guestName is required');
    if (attending === undefined) throw new Error('attending is required');

    console.log(`Saving RSVP for ${guests.length} guest(s), attending: ${attending}`);
    guests.forEach((g, i) => {
      console.log(`  Guest ${i + 1}: ${g.englishName || g.name} (rowIndex: ${g.rowIndex})`);
    });

    const now = new Date();
    // Format date as MM/DD/YYYY to match Google Sheets format
    const date = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    // Format time as HH:MM (24-hour format)
    const time = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const confirmationText = attending ? 'Yes, Attending' : 'Regretfully Decline';
    
    console.log(`RSVP Data - Confirmation: "${confirmationText}", Date: "${date}", Time: "${time}"`);
    console.log(`Sheet structure: A=English Name, B=Arabic Name, C=Family Group, D=Confirmation, E=Table number, F=Date, G=Time`);

    // Obtain service account token with Sheets scope
    const token = await getAccessToken('https://www.googleapis.com/auth/spreadsheets');

    // Prepare batch update for multiple rows
    const updates: { range: string; values: string[][] }[] = [];
    const guestNames: string[] = [];

    for (const guest of guests) {
      // Calculate actual row number in Google Sheets
      // rowIndex is 0-based (excluding header), so:
      // - Header row = row 1
      // - First data row = row 2 (rowIndex 0 + 2)
      const actualRow = guest.rowIndex + 2;
      
      // Google Sheets column structure:
      // Column A (index 0): English Name (not updated)
      // Column B (index 1): Arabic Name (not updated)
      // Column C (index 2): Family Group (not updated)
      // Column D (index 3): Confirmation (updated)
      // Column E (index 4): Table number (not updated - manually assigned)
      // Column F (index 5): Date (updated)
      // Column G (index 6): Time (updated)
      // 
      // We need to update D, F, G separately since E (Table number) is in between
      // Use individual cell updates to avoid shifting data
      
      console.log(`Preparing update for ${guest.englishName || guest.name}: Row=${actualRow}, Confirmation=${confirmationText}, Date=${date}, Time=${time}`);
      console.log(`  Column mapping: D=Confirmation, F=Date, G=Time`);
      console.log(`  Writing to: Sheet1!D${actualRow} (Confirmation), Sheet1!F${actualRow} (Date), Sheet1!G${actualRow} (Time)`);
      
      // Update Confirmation (Column D, index 3) - single cell
      // IMPORTANT: Column D is the 4th column (A=0, B=1, C=2, D=3)
      updates.push({
        range: `Sheet1!D${actualRow}`,
        values: [[confirmationText]]
      });
      
      // Update Date (Column F, index 5) - single cell
      // IMPORTANT: Column F is the 6th column (A=0, B=1, C=2, D=3, E=4, F=5)
      updates.push({
        range: `Sheet1!F${actualRow}`,
        values: [[date]]
      });
      
      // Update Time (Column G, index 6) - single cell
      // IMPORTANT: Column G is the 7th column (A=0, B=1, C=2, D=3, E=4, F=5, G=6)
      updates.push({
        range: `Sheet1!G${actualRow}`,
        values: [[time]]
      });
      
      guestNames.push(guest.englishName || guest.name);
    }

    // Use batchUpdate for multiple rows (more efficient)
    if (updates.length === 1) {
      // Single update - use simpler API
      const { range, values } = updates[0];
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Sheets API error:', errorText);
        return new Response(JSON.stringify({ success: false, error: 'Failed to save RSVP to Google Sheets', note: errorText, guestNames, attending, date, time }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } else {
      // Multiple updates - use batchUpdate
      const batchUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`;
      
      // Log the updates for debugging
      console.log(`Batch updating ${updates.length} cells:`);
      updates.forEach((update, idx) => {
        console.log(`  ${idx + 1}. Range: ${update.range}, Values: ${JSON.stringify(update.values)}`);
      });
      
      const batchData = {
        valueInputOption: 'USER_ENTERED',
        data: updates.map(({ range, values }) => ({ 
          range: range,
          values: values,
          majorDimension: 'ROWS'
        })),
      };
      
      console.log('Batch update payload:', JSON.stringify(batchData, null, 2));
      
      const response = await fetch(batchUpdateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(batchData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Sheets API error:', errorText);
        return new Response(JSON.stringify({ success: false, error: 'Failed to save RSVP to Google Sheets', note: errorText, guestNames, attending, date, time }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      const responseData = await response.json();
      console.log('Batch update response:', JSON.stringify(responseData, null, 2));
    }

    console.log(`RSVP saved successfully for ${guests.length} guest(s)`);
    return new Response(JSON.stringify({ success: true, message: `RSVP saved successfully for ${guests.length} guest(s)!`, guestNames, attending, date, time }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error saving RSVP:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
