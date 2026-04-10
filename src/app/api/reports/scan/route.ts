import { NextRequest, NextResponse } from 'next/server';
import { listAllReports, getReportDetail } from '@/lib/salesforceClient';
import { findFieldsInReport } from '@/lib/reportUtils';
import { getSession } from '@/lib/sessionCookie';
import type { AffectedReport } from '@/lib/reportUtils';

export interface ScanRequestBody {
  /** Old field API names to search for */
  oldFieldNames: string[];
  /** If set, only scan reports whose primary object type matches */
  objectType?: string;
}

export interface ScanResponseBody {
  totalScanned: number;
  totalAffected: number;
  affectedReports: AffectedReport[];
  /** Which of the searched fields were actually found in at least one report */
  foundOldFields: string[];
  errors: Array<{ reportId: string; reportName: string; error: string }>;
}

export async function POST(req: NextRequest) {
  try {
    const { accessToken, instanceUrl } = getSession();
    const body: ScanRequestBody = await req.json();
    const { oldFieldNames, objectType } = body;

    if (!oldFieldNames || oldFieldNames.length === 0) {
      return NextResponse.json({ error: 'At least one field name is required' }, { status: 400 });
    }

    const auth = { accessToken, instanceUrl };
    const allReports = await listAllReports(auth);

    const affectedReports: AffectedReport[] = [];
    const errors: Array<{ reportId: string; reportName: string; error: string }> = [];
    const foundFieldsSet = new Set<string>();

    const BATCH_SIZE = 10;
    for (let i = 0; i < allReports.length; i += BATCH_SIZE) {
      const batch = allReports.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (report) => {
          try {
            const detail = await getReportDetail(auth, report.id);
            const metadata = detail.reportMetadata;

            if (
              objectType &&
              metadata.reportType?.type?.toUpperCase() !== objectType.toUpperCase()
            ) {
              return;
            }

            const foundFields = findFieldsInReport(metadata, oldFieldNames);
            if (foundFields.length === 0) return;

            foundFields.forEach((f) => foundFieldsSet.add(f));
            affectedReports.push({
              reportId: report.id,
              reportName: report.name,
              folderName: report.folderName,
              reportObjectType: metadata.reportType?.type ?? '',
              foundFields,
              originalMetadata: metadata,
            });
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
      totalAffected: affectedReports.length,
      affectedReports,
      foundOldFields: Array.from(foundFieldsSet),
      errors,
    } satisfies ScanResponseBody);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message.includes('Not authenticated') ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
