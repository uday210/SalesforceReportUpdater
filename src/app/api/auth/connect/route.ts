import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateWithClientCredentials,
  authenticateWithUsernamePassword,
  getOrgInfo,
} from '@/lib/salesforceClient';

export type AuthMethod = 'client_credentials' | 'username_password';

export interface ConnectRequestBody {
  method: AuthMethod;
  // shared
  clientId?: string;
  clientSecret?: string;
  // client_credentials only
  domain?: string;
  // username_password only
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

export async function POST(req: NextRequest) {
  try {
    const body: ConnectRequestBody = await req.json();

    let auth: { accessToken: string; instanceUrl: string };

    if (body.method === 'username_password') {
      const { clientId, clientSecret, username, password, loginUrl } = body;
      if (!clientId || !clientSecret || !username || !password) {
        return NextResponse.json(
          { error: 'clientId, clientSecret, username, and password are required' },
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
      // Default: client_credentials
      const { domain, clientId, clientSecret } = body;
      if (!domain || !clientId || !clientSecret) {
        return NextResponse.json(
          { error: 'domain, clientId, and clientSecret are required' },
          { status: 400 },
        );
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
