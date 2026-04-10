import { NextRequest, NextResponse } from 'next/server';
import { updateReport } from '@/lib/salesforceClient';
import { getSession } from '@/lib/sessionCookie';
import type { ReportMetadata } from '@/lib/salesforceClient';

export interface UpdateTarget {
  reportId: string;
  reportName: string;
  updatedMetadata: ReportMetadata;
}

export interface UpdateRequestBody {
  targets: UpdateTarget[];
}

export interface UpdateResult {
  reportId: string;
  reportName: string;
  success: boolean;
  error?: string;
}

export interface UpdateResponseBody {
  results: UpdateResult[];
  successCount: number;
  failureCount: number;
}

export async function POST(req: NextRequest) {
  try {
    const { accessToken, instanceUrl } = getSession();
    const body: UpdateRequestBody = await req.json();
    const { targets } = body;

    if (!targets || targets.length === 0) {
      return NextResponse.json({ error: 'No targets provided' }, { status: 400 });
    }

    const auth = { accessToken, instanceUrl };
    const results: UpdateResult[] = [];

    for (const target of targets) {
      try {
        await updateReport(auth, target.reportId, target.updatedMetadata);
        results.push({ reportId: target.reportId, reportName: target.reportName, success: true });
      } catch (err) {
        results.push({
          reportId: target.reportId,
          reportName: target.reportName,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({
      results,
      successCount,
      failureCount: results.length - successCount,
    } satisfies UpdateResponseBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
