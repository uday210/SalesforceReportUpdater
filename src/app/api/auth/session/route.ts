import { NextResponse } from 'next/server';
import { getSession, hasSession } from '@/lib/sessionCookie';

export interface SessionResponseBody {
  connected: boolean;
  orgName?: string;
  orgType?: string;
  instanceUrl?: string;
}

/**
 * GET /api/auth/session
 * Returns current session info (no access token exposed to client).
 */
export async function GET() {
  if (!hasSession()) {
    return NextResponse.json({ connected: false } satisfies SessionResponseBody);
  }

  try {
    const session = getSession();
    return NextResponse.json({
      connected: true,
      orgName: session.orgName,
      orgType: session.orgType,
      instanceUrl: session.instanceUrl,
    } satisfies SessionResponseBody);
  } catch {
    return NextResponse.json({ connected: false } satisfies SessionResponseBody);
  }
}
