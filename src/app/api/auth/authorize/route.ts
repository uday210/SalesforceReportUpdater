import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const clientId = process.env.SF_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'SF_CLIENT_ID is not configured' }, { status: 500 });
  }

  const env = req.nextUrl.searchParams.get('env') ?? 'production';
  const loginDomain = env === 'sandbox' ? 'test.salesforce.com' : 'login.salesforce.com';

  const origin = process.env.APP_URL?.replace(/\/$/, '') ?? req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/callback`;

  // Debug mode
  if (req.nextUrl.searchParams.get('debug') === '1') {
    return NextResponse.json({ redirectUri, APP_URL: process.env.APP_URL ?? '(not set)' });
  }

  // PKCE: code_verifier + code_challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // CSRF state
  const state = crypto.randomUUID();

  const authUrl = new URL(`https://${loginDomain}/services/oauth2/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'api');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authUrl.toString());

  // Store state + codeVerifier in a short-lived httpOnly cookie
  response.cookies.set(
    'sf_oauth_state',
    JSON.stringify({ state, loginDomain, redirectUri, codeVerifier }),
    {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 10,
    },
  );

  return response;
}
