import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateWithClientCredentials,
  authenticateWithUsernamePassword,
  getOrgInfo,
} from '@/lib/salesforceClient';

export type AuthMethod = 'client_credentials' | 'username_password';

export interface ConnectRequestBody {
  method: AuthMethod;
  // client_credentials
  domain?: string;
  // username_password
  username?: string;
  password?: string; // password + security token concatenated
  loginUrl?: string; // defaults to login.salesforce.com
}

export interface ConnectResponseBody {
  accessToken: string;
  instanceUrl: string;
  orgName: string;
  orgType: string;
}

function getAppCredentials() {
  const clientId = process.env.SF_CLIENT_ID;
  const clientSecret = process.env.SF_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      'SF_CLIENT_ID and SF_CLIENT_SECRET environment variables are not configured on the server.',
    );
  }
  return { clientId, clientSecret };
}

export async function POST(req: NextRequest) {
  try {
    const body: ConnectRequestBody = await req.json();
    const { clientId, clientSecret } = getAppCredentials();

    let auth: { accessToken: string; instanceUrl: string };

    if (body.method === 'username_password') {
      const { username, password, loginUrl } = body;
      if (!username || !password) {
        return NextResponse.json(
          { error: 'username and password are required' },
          { status: 400 },
        );
      }
      auth = await authenticateWithUsernamePassword(
        clientId,
        clientSecret,
        username,
        password,
        loginUrl ?? 'login.salesforce.com',
      );
    } else {
      const { domain } = body;
      if (!domain) {
        return NextResponse.json({ error: 'domain is required' }, { status: 400 });
      }
      auth = await authenticateWithClientCredentials(domain, clientId, clientSecret);
    }

    const orgInfo = await getOrgInfo(auth);

    const response: ConnectResponseBody = {
      accessToken: auth.accessToken,
      instanceUrl: auth.instanceUrl,
      orgName: orgInfo.orgName,
      orgType: orgInfo.orgType,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
