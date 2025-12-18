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
    const { guestName, attending, rowIndex } = await req.json();
    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
    const sheetId = "13o9Y6YLPMtz-YFREYNu1L4o4dYrj3Dr-V3C_UstGeMs";

    if (!serviceAccountJson) {
      console.error('GOOGLE_SERVICE_ACCOUNT not configured');
      throw new Error('Google service account not configured');
    }

    if (!guestName) {
      console.error('No guestName provided');
      throw new Error('Guest name is required');
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

    console.log(`Saving RSVP for: ${guestName}, attending: ${attending}, row: ${rowIndex}`);

    // Create access token for Sheets API
    async function getAccessToken(sa: any) {
      const header = { alg: 'RS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        iss: sa.client_email,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
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

    // Get current date and time
    const now = new Date();
    const date = now.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const confirmationText = attending ? "Yes, Attending" : "Regretfully Decline";

    // Update the row with confirmation, date, and time (columns B, C, D)
    const actualRow = rowIndex + 2; // +1 for header, +1 because rowIndex is 0-based
    const range = `Sheet1!B${actualRow}:D${actualRow}`;

    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;

    const response = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        range: range,
        majorDimension: "ROWS",
        values: [[confirmationText, date, time]]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google Sheets API error:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: errorText,
        guestName,
        attending,
        date,
        time
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('RSVP saved successfully:', data);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'RSVP saved successfully!',
      guestName,
      attending,
      date,
      time
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error saving RSVP:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
