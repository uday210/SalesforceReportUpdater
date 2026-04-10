'use client';

import { useState } from 'react';
import type { ConnectResponseBody } from '@/app/api/auth/connect/route';

export interface ConnectionInfo {
  accessToken: string;
  instanceUrl: string;
  orgName: string;
  orgType: string;
}

interface Props {
  onConnected: (info: ConnectionInfo) => void;
}

export default function ConnectionStep({ onConnected }: Props) {
  const [domain, setDomain] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, clientId, clientSecret }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Connection failed');

      const info = data as ConnectResponseBody;
      onConnected({
        accessToken: info.accessToken,
        instanceUrl: info.instanceUrl,
        orgName: info.orgName,
        orgType: info.orgType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-sf-neutral-100 mb-2">Connect to Salesforce</h2>
        <p className="text-sf-neutral-70 text-sm leading-relaxed">
          Enter your Salesforce org&apos;s Connected App credentials. The app uses the{' '}
          <span className="font-medium text-sf-neutral-90">Client Credentials OAuth flow</span> — no
          user login required.
        </p>
      </div>

      <form onSubmit={handleConnect} className="space-y-5">
        {/* Domain */}
        <div>
          <label className="block text-sm font-medium text-sf-neutral-90 mb-1.5">
            Salesforce Domain
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="mycompany.my.salesforce.com"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100
                       text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2
                       focus:ring-sf-blue focus:border-sf-blue transition"
          />
          <p className="mt-1 text-xs text-sf-neutral-70">
            Without <code className="bg-sf-neutral-20 px-1 rounded">https://</code> — e.g.{' '}
            <code className="bg-sf-neutral-20 px-1 rounded">mycompany.my.salesforce.com</code>
          </p>
        </div>

        {/* Client ID */}
        <div>
          <label className="block text-sm font-medium text-sf-neutral-90 mb-1.5">
            Consumer Key (Client ID)
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="3MVG9..."
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100
                       text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2
                       focus:ring-sf-blue focus:border-sf-blue transition font-mono"
          />
        </div>

        {/* Client Secret */}
        <div>
          <label className="block text-sm font-medium text-sf-neutral-90 mb-1.5">
            Consumer Secret (Client Secret)
          </label>
          <input
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder="••••••••••••••••"
            required
            className="w-full px-3.5 py-2.5 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100
                       text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2
                       focus:ring-sf-blue focus:border-sf-blue transition font-mono"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg p-3.5">
            <svg className="w-4 h-4 text-sf-red mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-sf-red">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-sf-blue hover:bg-sf-blue-dark disabled:opacity-60
                     text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting...
            </>
          ) : (
            'Connect to Salesforce'
          )}
        </button>
      </form>

      {/* Help callout */}
      <div className="mt-8 p-4 bg-sf-neutral-10 border border-sf-neutral-30 rounded-lg text-xs text-sf-neutral-70 space-y-1.5">
        <p className="font-semibold text-sf-neutral-90">How to set up the Connected App</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>In Salesforce Setup, search for <strong>App Manager</strong></li>
          <li>Create a new <strong>Connected App</strong></li>
          <li>Enable <strong>OAuth Settings</strong>, add any callback URL</li>
          <li>Under OAuth scopes add: <em>Full access (full)</em> or <em>Manage user data via APIs (api)</em></li>
          <li>In the <strong>OAuth Policies</strong>, set IP Relaxation and enable <strong>Client Credentials Flow</strong></li>
          <li>Copy the <strong>Consumer Key</strong> and <strong>Consumer Secret</strong> here</li>
        </ol>
      </div>
    </div>
  );
}
