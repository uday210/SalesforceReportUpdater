import { NextRequest, NextResponse } from 'next/server';
import { listAllReports, getReportDetail } from '@/lib/salesforceClient';
import { analyzeReport } from '@/lib/reportUtils';
import { getSession } from '@/lib/sessionCookie';
import type { FieldMapping, ReportAnalysis } from '@/lib/reportUtils';

export interface ScanRequestBody {
  fieldMappings: FieldMapping[];
  targetObjectType?: string;
}

export interface ScanResponseBody {
  totalScanned: number;
  totalAffected: number;
  analyses: ReportAnalysis[];
  errors: Array<{ reportId: string; reportName: string; error: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const { accessToken, instanceUrl } = getSession();
    const body: ScanRequestBody = await req.json();
    const { fieldMappings, targetObjectType } = body;

    const validMappings = (fieldMappings ?? []).filter(
      (m) => m.oldField?.trim() && m.newField?.trim(),
    );

    if (validMappings.length === 0) {
      return NextResponse.json(
        { error: 'At least one valid field mapping is required' },
        { status: 400 },
      );
    }

    const auth = { accessToken, instanceUrl };
    const allReports = await listAllReports(auth);

    const analyses: ReportAnalysis[] = [];
    const errors: Array<{ reportId: string; reportName: string; error: string }> = [];

    const BATCH_SIZE = 10;
    for (let i = 0; i < allReports.length; i += BATCH_SIZE) {
      const batch = allReports.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (report) => {
          try {
            const detail = await getReportDetail(auth, report.id);
            const metadata = detail.reportMetadata;

            if (
              targetObjectType &&
              metadata.reportType?.type?.toUpperCase() !== targetObjectType.toUpperCase()
            ) {
              return;
            }

            const analysis = analyzeReport(
              report.id,
              report.name,
              report.folderName,
              metadata,
              validMappings,
            );

            analyses.push(analysis);
          } catch (err) {
            errors.push({
              reportId: report.id,
              reportName: report.name,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }),
      );
    }

    return NextResponse.json({
      totalScanned: allReports.length,
      totalAffected: analyses.filter((a) => a.hasChanges).length,
      analyses: analyses.filter((a) => a.hasChanges),
      errors,
    } satisfies ScanResponseBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
