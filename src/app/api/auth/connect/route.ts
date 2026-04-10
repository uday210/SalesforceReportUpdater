import { NextRequest, NextResponse } from 'next/server';
import { authenticateWithClientCredentials, getOrgInfo } from '@/lib/salesforceClient';
import { setSession } from '@/lib/sessionCookie';

/**
 * POST /api/auth/connect
 * Client Credentials flow — user supplies their own Connected App credentials.
 * Stores the resulting token in an httpOnly session cookie.
 */
export interface ConnectRequestBody {
  domain: string;
  clientId: string;
  clientSecret: string;
}

export interface ConnectResponseBody {
  orgName: string;
  orgType: string;
  instanceUrl: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ConnectRequestBody = await req.json();
    const { domain, clientId, clientSecret } = body;

    if (!domain || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'domain, clientId, and clientSecret are required' },
        { status: 400 },
      );
    }

    const auth = await authenticateWithClientCredentials(domain, clientId, clientSecret);
    const orgInfo = await getOrgInfo(auth);

    setSession({
      accessToken: auth.accessToken,
      instanceUrl: auth.instanceUrl,
      orgName: orgInfo.orgName,
      orgType: orgInfo.orgType,
    });

    return NextResponse.json({
      orgName: orgInfo.orgName,
      orgType: orgInfo.orgType,
      instanceUrl: auth.instanceUrl,
    } satisfies ConnectResponseBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
