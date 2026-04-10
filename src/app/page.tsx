'use client';

import { useState } from 'react';
import ConnectionStep, { type ConnectionInfo } from '@/components/ConnectionStep';
import ConfigureStep from '@/components/ConfigureStep';
import ScanResultsStep from '@/components/ScanResultsStep';
import DeployStep from '@/components/DeployStep';
import type { FieldMapping } from '@/lib/reportUtils';
import type { ScanResponseBody } from '@/app/api/reports/scan/route';
import type { UpdateResponseBody } from '@/app/api/reports/update/route';

type Step = 'connect' | 'configure' | 'results' | 'deploy';

const STEPS: { id: Step; label: string; description: string }[] = [
  { id: 'connect', label: 'Connect', description: 'Authenticate' },
  { id: 'configure', label: 'Configure', description: 'Map fields' },
  { id: 'results', label: 'Review', description: 'Inspect changes' },
  { id: 'deploy', label: 'Deploy', description: 'Apply updates' },
];

export default function HomePage() {
  const [step, setStep] = useState<Step>('connect');
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanProgress] = useState<{ scanned: number; total: number } | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponseBody | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [deploying, setDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<UpdateResponseBody | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleConnected(info: ConnectionInfo) {
    setConnection(info);
    setStep('configure');
  }

  function handleDisconnect() {
    setConnection(null);
    setScanResult(null);
    setScanError(null);
    setDeployResult(null);
    setDeployError(null);
    setStep('connect');
  }

  async function handleScan(fieldMappings: FieldMapping[], targetObjectType: string) {
    if (!connection) return;
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    setStep('results');

    try {
      const res = await fetch('/api/reports/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: connection.accessToken,
          instanceUrl: connection.instanceUrl,
          fieldMappings,
          targetObjectType: targetObjectType || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Scan failed');
      setScanResult(data as ScanResponseBody);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  async function handleDeploy(selectedIds: string[]) {
    if (!connection || !scanResult) return;

    const targets = scanResult.analyses
      .filter((a) => selectedIds.includes(a.reportId) && a.updatedMetadata !== null)
      .map((a) => ({
        reportId: a.reportId,
        reportName: a.reportName,
        updatedMetadata: a.updatedMetadata!,
      }));

    if (targets.length === 0) return;

    setDeploying(true);
    setDeployError(null);
    setDeployResult(null);
    setStep('deploy');

    try {
      const res = await fetch('/api/reports/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: connection.accessToken,
          instanceUrl: connection.instanceUrl,
          targets,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Deploy failed');
      setDeployResult(data as UpdateResponseBody);
    } catch (err) {
      setDeployError(err instanceof Error ? err.message : 'Deploy failed');
    } finally {
      setDeploying(false);
    }
  }

  function handleStartOver() {
    setScanResult(null);
    setScanError(null);
    setDeployResult(null);
    setDeployError(null);
    setStep('configure');
  }

  // Which steps are clickable (allow free nav once connected)
  function canNavigateTo(target: Step): boolean {
    if (target === 'connect') return true;
    if (!connection) return false;
    if (target === 'configure') return true;
    if (target === 'results') return !!scanResult || scanning;
    if (target === 'deploy') return !!deployResult || deploying;
    return false;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Step indicator */}
      <nav aria-label="Progress" className="mb-6">
        <ol className="flex items-center">
          {STEPS.map((s, index) => {
            const currentIndex = STEPS.findIndex((x) => x.id === step);
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const clickable = canNavigateTo(s.id) && !isCurrent && !scanning && !deploying;

            return (
              <li key={s.id} className="flex-1 relative">
                {index < STEPS.length - 1 && (
                  <div
                    className={`absolute top-4 left-1/2 w-full h-0.5 -z-0 transition-colors ${
                      isCompleted ? 'bg-sf-blue' : 'bg-sf-neutral-30'
                    }`}
                  />
                )}
                <div className="flex flex-col items-center relative z-10">
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && setStep(s.id)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                      ${isCompleted ? 'bg-sf-blue text-white' : ''}
                      ${isCurrent ? 'bg-sf-blue text-white ring-4 ring-blue-100' : ''}
                      ${!isCompleted && !isCurrent ? 'bg-white border-2 border-sf-neutral-30 text-sf-neutral-50' : ''}
                      ${clickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'}
                    `}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </button>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-semibold ${isCurrent ? 'text-sf-blue' : isCompleted ? 'text-sf-neutral-90' : 'text-sf-neutral-50'}`}>
                      {s.label}
                    </p>
                    <p className="text-xs text-sf-neutral-50 hidden sm:block">{s.description}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Connected badge (shown on all steps after connecting) */}
      {connection && step !== 'connect' && (
        <div className="mb-4 flex items-center gap-2.5 px-4 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm">
          <div className="w-2 h-2 rounded-full bg-sf-green shrink-0" />
          <span className="font-medium text-sf-neutral-90">{connection.orgName}</span>
          <span className="text-sf-neutral-70 text-xs truncate hidden sm:block">{connection.instanceUrl}</span>
          <button
            onClick={handleDisconnect}
            className="ml-auto text-xs text-sf-neutral-70 hover:text-sf-red transition shrink-0"
          >
            Disconnect
          </button>
        </div>
      )}

      {/* Step panels */}
      <div className="bg-white rounded-2xl shadow-sm border border-sf-neutral-30 p-8">
        {step === 'connect' && <ConnectionStep onConnected={handleConnected} />}

        {step === 'configure' && connection && (
          <ConfigureStep
            connection={connection}
            onScan={handleScan}
            onDisconnect={handleDisconnect}
          />
        )}

        {step === 'results' && (
          <ScanResultsStep
            scanning={scanning}
            scanProgress={scanProgress}
            scanResult={scanResult}
            scanError={scanError}
            onDeploy={handleDeploy}
            onBack={() => setStep('configure')}
          />
        )}

        {step === 'deploy' && (
          <DeployStep
            deploying={deploying}
            deployResult={deployResult}
            deployError={deployError}
            onStartOver={handleStartOver}
            onBack={() => setStep('results')}
          />
        )}
      </div>
    </>
  );
}
