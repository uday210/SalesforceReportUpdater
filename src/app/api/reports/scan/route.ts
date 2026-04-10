import { NextRequest, NextResponse } from 'next/server';
import { listAllReports, getReportDetail } from '@/lib/salesforceClient';
import { analyzeReport } from '@/lib/reportUtils';
import type { FieldMapping, ReportAnalysis } from '@/lib/reportUtils';

export interface ScanRequestBody {
  accessToken: string;
  instanceUrl: string;
  fieldMappings: FieldMapping[];
  /** Optional: only return reports whose primary object type matches this value */
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
    const body: ScanRequestBody = await req.json();
    const { accessToken, instanceUrl, fieldMappings, targetObjectType } = body;

    if (!accessToken || !instanceUrl) {
      return NextResponse.json({ error: 'accessToken and instanceUrl are required' }, { status: 400 });
    }

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

    // 1. Fetch list of all reports
    const allReports = await listAllReports(auth);

    // 2. Filter by object type early if specified (object type comes from metadata,
    //    so we still need to fetch — this is just a post-fetch filter below)
    const analyses: ReportAnalysis[] = [];
    const errors: Array<{ reportId: string; reportName: string; error: string }> = [];

    // 3. Fetch metadata for each report and analyse
    // We process them in batches to avoid overwhelming the API
    const BATCH_SIZE = 10;
    for (let i = 0; i < allReports.length; i += BATCH_SIZE) {
      const batch = allReports.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (report) => {
          try {
            const detail = await getReportDetail(auth, report.id);
            const metadata = detail.reportMetadata;

            // Skip if caller wants a specific object type and this doesn't match
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

    const affectedAnalyses = analyses.filter((a) => a.hasChanges);

    const response: ScanResponseBody = {
      totalScanned: allReports.length,
      totalAffected: affectedAnalyses.length,
      // Return only affected reports to keep payload small; client can request all if needed
      analyses: affectedAnalyses,
      errors,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
