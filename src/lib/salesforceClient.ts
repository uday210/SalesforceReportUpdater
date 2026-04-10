const SF_API_VERSION = 'v62.0';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface SalesforceAuth {
  accessToken: string;
  instanceUrl: string;
}

export interface SalesforceReport {
  id: string;
  name: string;
  url: string;
  folderName?: string;
  developerName?: string;
  lastModifiedDate?: string;
}

export interface ReportGrouping {
  name: string;
  sortOrder: string;
  groupingLevel?: number;
  dateGranularity?: string;
}

export interface ReportFilter {
  column: string;
  operator: string;
  value: string;
  isRunPageEditable: boolean;
}

export interface ReportMetadata {
  id: string;
  name: string;
  reportType: { type: string; label: string };
  reportFormat: string;
  detailColumns: string[];
  groupingsDown: ReportGrouping[];
  groupingsAcross: ReportGrouping[];
  reportFilters: ReportFilter[];
  aggregates?: string[];
  description?: string | null;
  currency?: string | null;
  reportBooleanFilter?: string | null;
  scope?: string;
  standardFilters?: unknown[];
  crossFilters?: unknown[];
  customSummaryFormula?: unknown;
  historicalSnapshotDates?: unknown[];
  buckets?: unknown[];
}

export interface OrgInfo {
  orgName: string;
  orgType: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function authenticateWithClientCredentials(
  domain: string,
  clientId: string,
  clientSecret: string,
): Promise<SalesforceAuth> {
  // Normalise domain: strip protocol if user pasted a full URL
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const tokenUrl = `https://${cleanDomain}/services/oauth2/token`;

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error_description: 'Authentication failed' }));
    throw new Error(error.error_description || error.error || 'Authentication failed');
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    instanceUrl: data.instance_url,
  };
}

// ── Org Info ───────────────────────────────────────────────────────────────────

export async function getOrgInfo(auth: SalesforceAuth): Promise<OrgInfo> {
  const query = encodeURIComponent('SELECT Name, OrganizationType FROM Organization LIMIT 1');
  const response = await fetch(
    `${auth.instanceUrl}/services/data/${SF_API_VERSION}/query?q=${query}`,
    { headers: { Authorization: `Bearer ${auth.accessToken}` } },
  );

  if (!response.ok) {
    return { orgName: 'Salesforce Org', orgType: 'Connected' };
  }

  const data = await response.json();
  const record = data.records?.[0];
  return {
    orgName: record?.Name ?? 'Salesforce Org',
    orgType: record?.OrganizationType ?? '',
  };
}

// ── Reports ────────────────────────────────────────────────────────────────────

/**
 * Lists all reports in the org via Tooling API SOQL (handles pagination).
 * Falls back to the Analytics REST endpoint if the Tooling query fails.
 */
export async function listAllReports(auth: SalesforceAuth): Promise<SalesforceReport[]> {
  const reports: SalesforceReport[] = [];

  // Primary: Tooling API SOQL — gives us DeveloperName + FolderName
  const query = encodeURIComponent(
    'SELECT Id, Name, DeveloperName, FolderName, LastModifiedDate FROM Report ORDER BY Name',
  );

  let nextUrl = `${auth.instanceUrl}/services/data/${SF_API_VERSION}/tooling/query?q=${query}` as string | null;

  while (nextUrl !== null) {
    const url: string = nextUrl;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${auth.accessToken}` },
    });

    if (!response.ok) {
      // Fallback: Analytics listing endpoint
      return listReportsViaAnalyticsApi(auth);
    }

    const data = await response.json();

    for (const rec of data.records ?? []) {
      reports.push({
        id: rec.Id,
        name: rec.Name,
        url: rec.attributes?.url ?? '',
        folderName: rec.FolderName,
        developerName: rec.DeveloperName,
        lastModifiedDate: rec.LastModifiedDate,
      });
    }

    nextUrl = data.nextRecordsUrl ? `${auth.instanceUrl}${data.nextRecordsUrl}` : null;
  }

  return reports;
}

async function listReportsViaAnalyticsApi(auth: SalesforceAuth): Promise<SalesforceReport[]> {
  const response = await fetch(
    `${auth.instanceUrl}/services/data/${SF_API_VERSION}/analytics/reports`,
    { headers: { Authorization: `Bearer ${auth.accessToken}` } },
  );

  if (!response.ok) throw new Error('Failed to list reports');

  const data = await response.json();
  const items: SalesforceReport[] = [];

  // The Analytics /reports endpoint returns an array of report summaries
  for (const r of Array.isArray(data) ? data : []) {
    items.push({
      id: r.id,
      name: r.name,
      url: r.url ?? '',
      folderName: r.folderName,
    });
  }

  return items;
}

// ── Report Detail ──────────────────────────────────────────────────────────────

export interface ReportDetail {
  reportMetadata: ReportMetadata;
}

export async function getReportDetail(
  auth: SalesforceAuth,
  reportId: string,
): Promise<ReportDetail> {
  const response = await fetch(
    `${auth.instanceUrl}/services/data/${SF_API_VERSION}/analytics/reports/${reportId}?includeDetails=true`,
    { headers: { Authorization: `Bearer ${auth.accessToken}` } },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch report ${reportId}: ${text}`);
  }

  return response.json();
}

// ── Report Update ──────────────────────────────────────────────────────────────

export async function updateReport(
  auth: SalesforceAuth,
  reportId: string,
  reportMetadata: ReportMetadata,
): Promise<void> {
  const response = await fetch(
    `${auth.instanceUrl}/services/data/${SF_API_VERSION}/analytics/reports/${reportId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reportMetadata }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    let message = `Failed to update report ${reportId}`;
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        message = parsed.map((e: { message?: string }) => e.message).join('; ');
      }
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }
}
