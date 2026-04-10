import { NextRequest, NextResponse } from 'next/server';
import { updateReport } from '@/lib/salesforceClient';
import type { ReportMetadata } from '@/lib/salesforceClient';

export interface UpdateTarget {
  reportId: string;
  reportName: string;
  updatedMetadata: ReportMetadata;
}

export interface UpdateRequestBody {
  accessToken: string;
  instanceUrl: string;
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
    const body: UpdateRequestBody = await req.json();
    const { accessToken, instanceUrl, targets } = body;

    if (!accessToken || !instanceUrl) {
      return NextResponse.json(
        { error: 'accessToken and instanceUrl are required' },
        { status: 400 },
      );
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({ error: 'No targets provided' }, { status: 400 });
    }

    const auth = { accessToken, instanceUrl };
    const results: UpdateResult[] = [];

    // Process sequentially to avoid rate-limiting
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
    const failureCount = results.length - successCount;

    const response: UpdateResponseBody = { results, successCount, failureCount };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
