import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Get access token for Google APIs.
// Priority: 1) GOOGLE_SERVICE_ACCOUNT (works with regular Drive folders if shared with service account)
//           2) OAuth refresh token (fallback)
async function getAccessToken(scopes: string): Promise<string> {
  // --- 1) Service Account flow (PRIORITY - works with regular folders if shared with service account email)
  const serviceAccountRaw = (Deno.env.get('GOOGLE_SERVICE_ACCOUNT') ?? '').trim();
  if (serviceAccountRaw) {
    console.log('Using Service Account authentication via GOOGLE_SERVICE_ACCOUNT');
    let serviceAccount: any;
    try {
      // Try direct JSON first
      serviceAccount = JSON.parse(serviceAccountRaw);
    } catch {
      try {
        // If not plain JSON, it may be base64-encoded
        const decoded = atob(serviceAccountRaw);
        serviceAccount = JSON.parse(decoded);
      } catch {
        // Or JSON with escaped newlines/backslashes
        const cleaned = serviceAccountRaw.replace(/\\n/g, '\n').replace(/\\/g, '');
        serviceAccount = JSON.parse(cleaned);
      }
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
    if (!tokenData.access_token) {
      console.error('Service Account token error:', JSON.stringify(tokenData));
      throw new Error(`Token error: ${JSON.stringify(tokenData)}`);
    }
    console.log('Service Account token retrieved successfully');
    return tokenData.access_token as string;
  }

  // --- 2) OAuth refresh-token flow (fallback - uses user's quota)
  const clientId = (Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '').trim();
  const clientSecret = (Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '').trim();
  const refreshToken = (Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN') ?? '').trim();

  if (clientId && clientSecret && refreshToken) {
    console.log('Falling back to OAuth refresh token flow...');

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

  throw new Error(
    'Missing credentials: need GOOGLE_SERVICE_ACCOUNT (preferred) or GOOGLE_OAUTH_CLIENT_ID + GOOGLE_OAUTH_CLIENT_SECRET + GOOGLE_OAUTH_REFRESH_TOKEN'
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Add detailed logging for debugging
  console.log('Request received:', {
    method: req.method,
    headers: Object.fromEntries(req.headers.entries()),
  });

  try {
    let fileName: string | undefined;
    let mimeType: string | undefined;
    let fileBuffer: Uint8Array | undefined;
    let folderId = Deno.env.get('UPLOAD_FOLDER_ID');

    const contentType = req.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);
    
    if (contentType.includes('multipart/form-data')) {
      console.log('Processing multipart/form-data request...');
      try {
        const formData = await req.formData();
        console.log('FormData parsed successfully');
        
        const file = formData.get('file') as File | null;
        if (!file) {
          console.error('No file found in formData');
          throw new Error('File is required (multipart)');
        }
        
        folderId = (formData.get('folderId') as string) || folderId;
        fileName = file.name;
        mimeType = file.type || 'application/octet-stream';
        
        console.log('File details from FormData:', {
          fileName,
          mimeType,
          size: file.size,
          folderId
        });
        
        const ab = await file.arrayBuffer();
        fileBuffer = new Uint8Array(ab);
        console.log(`File buffer created: ${fileBuffer.length} bytes`);
      } catch (formDataError) {
        console.error('Error processing FormData:', formDataError);
        throw new Error(`Failed to process multipart form data: ${formDataError instanceof Error ? formDataError.message : 'Unknown error'}`);
      }
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
    console.log('File details:', { fileName, mimeType, folderId });
    console.log('Uploading file to Google Drive...');

    // Track which auth method we're using
    const serviceAccountRaw = (Deno.env.get('GOOGLE_SERVICE_ACCOUNT') ?? '').trim();
    let token = await getAccessToken('https://www.googleapis.com/auth/drive');
    let usingServiceAccount = !!serviceAccountRaw;
    console.log(`Access token retrieved successfully (using ${usingServiceAccount ? 'Service Account' : 'OAuth'})`);

    const boundary = '-------314159265358979323846';
    const metadata = { name: fileName, parents: [folderId] };
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    // Convert fileBuffer to base64 efficiently
    // Always use chunked encoding to avoid stack overflow (spread operator causes issues)
    let base64Data: string;
    try {
      const fileSizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
      console.log(`Encoding file to base64 (${fileSizeMB}MB, ${fileBuffer.length} bytes)...`);
      
      // Use chunked encoding for all files to avoid stack overflow
      // Process in chunks and build the binary string incrementally
      const chunkSize = 16384; // 16KB chunks - larger chunks reduce string concatenation overhead
      let binaryString = '';
      
      // Process file in chunks to avoid stack overflow
      for (let i = 0; i < fileBuffer.length; i += chunkSize) {
        const chunk = fileBuffer.slice(i, Math.min(i + chunkSize, fileBuffer.length));
        // Convert chunk to string using Array.from and map to avoid spread operator
        const chunkArray = Array.from(chunk);
        const chunkString = chunkArray.map(byte => String.fromCharCode(byte)).join('');
        binaryString += chunkString;
      }
      
      // Convert the complete binary string to base64
      base64Data = btoa(binaryString);
      
      console.log(`Base64 encoding complete (${(base64Data.length / 1024 / 1024).toFixed(2)}MB base64)`);
    } catch (base64Error) {
      console.error('Base64 encoding error:', base64Error);
      const fileSizeMB = (fileBuffer.length / 1024 / 1024).toFixed(2);
      throw new Error(`Failed to encode file to base64: ${base64Error instanceof Error ? base64Error.message : 'Unknown error'}. File size: ${fileSizeMB}MB. This may indicate the file is too large or corrupted.`);
    }
    
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
      
      // Check if this is a service account quota error
      let errorJson: any;
      try {
        errorJson = JSON.parse(errorText);
      } catch {
        errorJson = {};
      }
      
      const isQuotaError = errorJson?.error?.errors?.some((e: any) => 
        e.reason === 'storageQuotaExceeded' || 
        errorText.includes('Service Accounts do not have storage quota') ||
        errorText.includes('storageQuotaExceeded')
      );
      
      // If using service account and got quota error, try OAuth fallback
      if (isQuotaError && usingServiceAccount) {
        console.log('Service account quota error detected. Attempting OAuth fallback...');
        console.log('Checking for OAuth credentials...');
        
        // Temporarily clear service account to force OAuth
        const originalServiceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT');
        try {
          // Try to get OAuth token by checking if OAuth credentials exist
          const clientId = (Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '').trim();
          const clientSecret = (Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '').trim();
          const refreshToken = (Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN') ?? '').trim();
          
          console.log(`OAuth check: clientId=${clientId ? 'SET' : 'MISSING'}, clientSecret=${clientSecret ? 'SET' : 'MISSING'}, refreshToken=${refreshToken ? 'SET' : 'MISSING'}`);
          
          if (clientId && clientSecret && refreshToken) {
            console.log('OAuth credentials found, retrying with OAuth...');
            
            const body = new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: refreshToken,
              grant_type: 'refresh_token',
            }).toString();
            
            const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body,
            });
            
            if (!tokenResp.ok) {
              const tokenErrorText = await tokenResp.text();
              console.error('OAuth token refresh failed:', tokenResp.status, tokenErrorText);
              throw new Error(
                `OAuth token refresh failed (${tokenResp.status}): ${tokenErrorText}. ` +
                'This may indicate an invalid or expired refresh token. Please generate a new refresh token.'
              );
            }
            
            const tokenData = await tokenResp.json();
            if (!tokenData.access_token) {
              console.error('OAuth token response missing access_token:', JSON.stringify(tokenData));
              throw new Error(
                'OAuth token refresh succeeded but no access_token in response. ' +
                'Please check your OAuth credentials and try generating a new refresh token.'
              );
            }
            
            const oauthToken = tokenData.access_token;
            console.log('Retrying upload with OAuth token...');
            
            const retryResp = await fetch(uploadUrl, {
              method: 'POST',
              headers: { Authorization: `Bearer ${oauthToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
              body: multipartRequestBody,
            });
            
            if (retryResp.ok) {
              const result = await retryResp.json();
              console.log('File uploaded successfully with OAuth:', result);
              
              // Set public permission
              try {
                const permResp = await fetch(`https://www.googleapis.com/drive/v3/files/${result.id}/permissions`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${oauthToken}` },
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
            } else {
              const retryError = await retryResp.text();
              console.error('OAuth retry upload failed:', retryResp.status, retryError);
              throw new Error(
                `OAuth upload retry failed (${retryResp.status}): ${retryError}. ` +
                'OAuth token was obtained but upload still failed.'
              );
            }
          } else {
            throw new Error('OAuth credentials not configured. Service accounts cannot upload to regular Drive folders. Please set up OAuth refresh token (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN) or use a Shared Drive.');
          }
        } catch (oauthError) {
          console.error('OAuth fallback failed:', oauthError);
          // If OAuth fallback failed, provide helpful error message
          if (isQuotaError) {
            throw new Error(
              'Service accounts cannot upload to regular Google Drive folders due to storage quota limitations. ' +
              'OAuth fallback attempted but failed. ' +
              'Solutions: 1) Set up OAuth refresh token properly (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN) ' +
              '2) Use a Shared Drive (Team Drive) instead of a regular folder. ' +
              'See SETUP_OAUTH.md for detailed instructions.'
            );
          }
        }
      } else if (isQuotaError) {
        // Quota error but not using service account (shouldn't happen, but handle it)
        throw new Error(
          'Google Drive storage quota error. ' +
          'Service accounts cannot upload to regular Drive folders. ' +
          'Please set up OAuth refresh token or use a Shared Drive. ' +
          'See SETUP_OAUTH.md for instructions.'
        );
      }
      
      const snippet = errorText.length > 1200 ? `${errorText.slice(0, 1200)}…` : errorText;
      throw new Error(`Drive upload failed (${uploadResp.status}): ${snippet}`);
    }

    const result = await uploadResp.json();
    console.log('File uploaded successfully:', result);

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
    
    // Add more context to error messages for better debugging
    let detailedError = errorMessage;
    if (error instanceof Error) {
      // Check for specific error types and provide helpful messages
      if (errorMessage.includes('base64') || errorMessage.includes('encode')) {
        detailedError = `File encoding failed: ${errorMessage}. The file may be too large or corrupted.`;
      } else if (errorMessage.includes('folderId') || errorMessage.includes('folder')) {
        detailedError = `Upload folder not configured: ${errorMessage}. Please check UPLOAD_FOLDER_ID environment variable.`;
      } else if (errorMessage.includes('Token') || errorMessage.includes('authentication') || errorMessage.includes('OAuth')) {
        detailedError = `Authentication failed: ${errorMessage}. Please check your Google credentials (GOOGLE_SERVICE_ACCOUNT or OAuth tokens).`;
      } else if (errorMessage.includes('quota') || errorMessage.includes('storage') || errorMessage.includes('Service Accounts')) {
        detailedError = `Storage quota issue: ${errorMessage}. Service accounts cannot upload to regular Drive folders. Please set up OAuth credentials (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN).`;
      } else if (errorMessage.includes('Drive upload failed')) {
        // Keep the detailed Drive API error
        detailedError = errorMessage;
      }
    }
    
    console.error('Returning detailed error message:', detailedError);
    return new Response(JSON.stringify({ success: false, error: detailedError }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
