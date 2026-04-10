import { NextRequest, NextResponse } from 'next/server';
import { getObjectFields } from '@/lib/salesforceClient';
import { getSession } from '@/lib/sessionCookie';
import type { SalesforceField } from '@/lib/salesforceClient';

export interface FieldsRequestBody {
  objectName: string;
}

export interface FieldsResponseBody {
  fields: SalesforceField[];
}

export async function POST(req: NextRequest) {
  try {
    const { accessToken, instanceUrl } = getSession();
    const body: FieldsRequestBody = await req.json();
    const { objectName } = body;

    if (!objectName) {
      return NextResponse.json({ error: 'objectName is required' }, { status: 400 });
    }

    const fields = await getObjectFields({ accessToken, instanceUrl }, objectName);

    fields.sort((a, b) => {
      const aIsLookup = a.type === 'reference';
      const bIsLookup = b.type === 'reference';
      if (aIsLookup && !bIsLookup) return -1;
      if (!aIsLookup && bIsLookup) return 1;
      return a.label.localeCompare(b.label);
    });

    return NextResponse.json({ fields } satisfies FieldsResponseBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
