import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateWithClientCredentials,
  getOrgInfo,
} from '@/lib/salesforceClient';

export interface ConnectRequestBody {
  domain: string;
  clientId: string;
  clientSecret: string;
}

export interface ConnectResponseBody {
  accessToken: string;
  instanceUrl: string;
  orgName: string;
  orgType: string;
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

    const responseBody: ConnectResponseBody = {
      accessToken: auth.accessToken,
      instanceUrl: auth.instanceUrl,
      orgName: orgInfo.orgName,
      orgType: orgInfo.orgType,
    };

    return NextResponse.json(responseBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
