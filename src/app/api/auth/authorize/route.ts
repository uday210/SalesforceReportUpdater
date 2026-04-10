import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/auth/authorize?env=production|sandbox
 *
 * Redirects the browser to the Salesforce OAuth authorization page.
 * Uses the app-level Connected App credentials from env vars.
 */
export async function GET(req: NextRequest) {
  const clientId = process.env.SF_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'SF_CLIENT_ID is not configured on the server' },
      { status: 500 },
    );
  }

  const env = req.nextUrl.searchParams.get('env') ?? 'production';
  const loginDomain =
    env === 'sandbox' ? 'test.salesforce.com' : 'login.salesforce.com';

  // Use explicit APP_URL env var if set (recommended for prod), otherwise derive from request
  const origin = process.env.APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback`;

  // CSRF state — store in a short-lived cookie
  const state = crypto.randomUUID();

  const authUrl = new URL(`https://${loginDomain}/services/oauth2/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'api');
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl.toString());

  // Store state + loginDomain so callback can verify + use correct token endpoint
  response.cookies.set('sf_oauth_state', JSON.stringify({ state, loginDomain, redirectUri }), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10, // 10 min — only needed during the OAuth round-trip
  });

  return response;
}
