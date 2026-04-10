'use client';

import type { UpdateResponseBody, UpdateResult } from '@/app/api/reports/update/route';

interface Props {
  deploying: boolean;
  deployResult: UpdateResponseBody | null;
  deployError: string | null;
  onStartOver: () => void;
  onBack: () => void;
}

export default function DeployStep({
  deploying,
  deployResult,
  deployError,
  onStartOver,
  onBack,
}: Props) {
  // ── Deploying ──────────────────────────────────────────────────────────────
  if (deploying) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-6">
          <svg className="animate-spin h-8 w-8 text-sf-blue" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-sf-neutral-100 mb-2">Deploying Updates…</h2>
        <p className="text-sm text-sf-neutral-70">
          Saving updated report metadata back to Salesforce.
        </p>
      </div>
    );
  }

  // ── Fatal error ────────────────────────────────────────────────────────────
  if (deployError) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-5 mb-5">
          <svg className="w-5 h-5 text-sf-red mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-medium text-sf-red">Deploy failed</p>
            <p className="text-sm text-sf-neutral-70 mt-0.5">{deployError}</p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="text-sm text-sf-blue hover:text-sf-blue-dark font-medium transition"
        >
          ← Back to results
        </button>
      </div>
    );
  }

  if (!deployResult) return null;

  const allSuccess = deployResult.failureCount === 0;
  const allFailed = deployResult.successCount === 0;

  // ── Results ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            allSuccess
              ? 'bg-green-50'
              : allFailed
              ? 'bg-red-50'
              : 'bg-yellow-50'
          }`}
        >
          {allSuccess && (
            <svg className="w-8 h-8 text-sf-green" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {allFailed && (
            <svg className="w-8 h-8 text-sf-red" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {!allSuccess && !allFailed && (
            <svg className="w-8 h-8 text-sf-yellow" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        <h2 className="text-2xl font-semibold text-sf-neutral-100">
          {allSuccess ? 'All reports updated!' : allFailed ? 'Deploy failed' : 'Deploy complete'}
        </h2>
        <p className="text-sm text-sf-neutral-70 mt-2">
          <span className="text-sf-green font-medium">{deployResult.successCount} succeeded</span>
          {deployResult.failureCount > 0 && (
            <>
              {' · '}
              <span className="text-sf-red font-medium">{deployResult.failureCount} failed</span>
            </>
          )}
        </p>
      </div>

      {/* Results list */}
      <div className="border border-sf-neutral-30 rounded-xl overflow-hidden divide-y divide-sf-neutral-30 mb-8">
        {deployResult.results.map((result) => (
          <ResultRow key={result.reportId} result={result} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!allSuccess && (
          <button
            onClick={onBack}
            className="flex-1 py-2.5 px-4 border border-sf-neutral-30 text-sf-neutral-90 font-semibold
                       rounded-lg hover:bg-sf-neutral-10 transition text-sm"
          >
            Back to Results
          </button>
        )}
        <button
          onClick={onStartOver}
          className="flex-1 py-2.5 px-4 bg-sf-blue hover:bg-sf-blue-dark text-white font-semibold
                     rounded-lg transition text-sm"
        >
          {allSuccess ? 'Start Another Update' : 'Start Over'}
        </button>
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: UpdateResult }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${result.success ? 'bg-white' : 'bg-red-50'}`}>
      {result.success ? (
        <svg className="w-4 h-4 text-sf-green shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-sf-red shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-sf-neutral-100 truncate block">
          {result.reportName}
        </span>
        {result.error && (
          <span className="text-xs text-sf-red mt-0.5 block">{result.error}</span>
        )}
      </div>

      <span className={`text-xs font-medium shrink-0 ${result.success ? 'text-sf-green' : 'text-sf-red'}`}>
        {result.success ? 'Updated' : 'Failed'}
      </span>
    </div>
  );
}
