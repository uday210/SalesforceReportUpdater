import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForToken, getOrgInfo } from '@/lib/salesforceClient';
import { setSession } from '@/lib/sessionCookie';

/**
 * GET /api/auth/callback?code=...&state=...
 *
 * Salesforce redirects here after the user logs in.
 * Exchanges the authorization code for an access token and stores it in an httpOnly cookie.
 */
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;

  try {
    const code = req.nextUrl.searchParams.get('code');
    const returnedState = req.nextUrl.searchParams.get('state');
    const sfError = req.nextUrl.searchParams.get('error');
    const sfErrorDesc = req.nextUrl.searchParams.get('error_description');

    // Salesforce returned an error (e.g. user denied access)
    if (sfError) {
      const msg = sfErrorDesc ?? sfError;
      return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(msg)}`);
    }

    if (!code || !returnedState) {
      return NextResponse.redirect(`${origin}/?auth_error=Missing+code+or+state`);
    }

    // Verify CSRF state
    const stateCookie = req.cookies.get('sf_oauth_state')?.value;
    if (!stateCookie) {
      return NextResponse.redirect(`${origin}/?auth_error=Missing+state+cookie`);
    }

    let oauthState: { state: string; loginDomain: string; redirectUri: string };
    try {
      oauthState = JSON.parse(stateCookie);
    } catch {
      return NextResponse.redirect(`${origin}/?auth_error=Invalid+state+cookie`);
    }

    if (oauthState.state !== returnedState) {
      return NextResponse.redirect(`${origin}/?auth_error=State+mismatch`);
    }

    const clientId = process.env.SF_CLIENT_ID!;
    const clientSecret = process.env.SF_CLIENT_SECRET!;

    // Exchange code for token
    const auth = await exchangeCodeForToken(
      code,
      oauthState.redirectUri,
      clientId,
      clientSecret,
      oauthState.loginDomain,
    );

    const orgInfo = await getOrgInfo(auth);

    // Store session in httpOnly cookie
    setSession({
      accessToken: auth.accessToken,
      instanceUrl: auth.instanceUrl,
      orgName: orgInfo.orgName,
      orgType: orgInfo.orgType,
    });

    // Clear the CSRF state cookie
    const response = NextResponse.redirect(`${origin}/?connected=1`);
    response.cookies.delete('sf_oauth_state');
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Authentication failed';
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(msg)}`);
  }
}
