import { NextRequest, NextResponse } from 'next/server';
import { getObjectFields } from '@/lib/salesforceClient';
import type { SalesforceField } from '@/lib/salesforceClient';

export interface FieldsRequestBody {
  accessToken: string;
  instanceUrl: string;
  objectName: string;
}

export interface FieldsResponseBody {
  fields: SalesforceField[];
}

export async function POST(req: NextRequest) {
  try {
    const body: FieldsRequestBody = await req.json();
    const { accessToken, instanceUrl, objectName } = body;

    if (!accessToken || !instanceUrl || !objectName) {
      return NextResponse.json(
        { error: 'accessToken, instanceUrl, and objectName are required' },
        { status: 400 },
      );
    }

    const fields = await getObjectFields({ accessToken, instanceUrl }, objectName);

    // Sort: lookup/reference fields first, then alphabetically by label
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
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
