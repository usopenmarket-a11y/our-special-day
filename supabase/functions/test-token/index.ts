import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET');
    const refreshToken = Deno.env.get('GOOGLE_OAUTH_REFRESH_TOKEN');

    // Check if secrets exist (without exposing values)
    const secretsStatus = {
      hasClientId: !!clientId && clientId.length > 10,
      hasClientSecret: !!clientSecret && clientSecret.length > 10,
      hasRefreshToken: !!refreshToken && refreshToken.length > 10,
    };

    if (!clientId || !clientSecret || !refreshToken) {
      return new Response(JSON.stringify({
        status: 'FAIL',
        reason: 'Missing OAuth credentials',
        secretsStatus,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Attempt to refresh the token
    console.log('Attempting to refresh OAuth token...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenText = await tokenResponse.text();
    console.log('Token response status:', tokenResponse.status);

    if (!tokenResponse.ok) {
      // Parse error but don't expose full details
      let errorType = 'unknown';
      try {
        const errorData = JSON.parse(tokenText);
        errorType = errorData.error || 'unknown';
        console.error('Token refresh error:', errorData);
      } catch {
        console.error('Token refresh raw error:', tokenText);
      }

      return new Response(JSON.stringify({
        status: 'FAIL',
        reason: `Token refresh failed: ${errorType}`,
        httpStatus: tokenResponse.status,
        secretsStatus,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Token refresh succeeded
    const tokenData = JSON.parse(tokenText);
    const hasAccessToken = !!tokenData.access_token;

    return new Response(JSON.stringify({
      status: 'OK',
      message: 'OAuth token refresh successful',
      hasAccessToken,
      tokenType: tokenData.token_type,
      expiresIn: tokenData.expires_in,
      secretsStatus,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Test token error:', error);
    return new Response(JSON.stringify({
      status: 'FAIL',
      reason: `Exception: ${errMsg}`,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
