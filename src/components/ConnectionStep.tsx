'use client';

import { useState } from 'react';

export interface ConnectionInfo {
  orgName: string;
  orgType: string;
  instanceUrl: string;
}

interface Props {
  onConnected: (info: ConnectionInfo) => void;
}

type Tab = 'oauth' | 'client_credentials';

export default function ConnectionStep({ onConnected }: Props) {
  const [tab, setTab] = useState<Tab>('oauth');
  const [sandbox, setSandbox] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client credentials fields
  const [domain, setDomain] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // ── OAuth: redirect to Salesforce login ──────────────────────────────────
  function handleOAuth() {
    const env = sandbox ? 'sandbox' : 'production';
    window.location.href = `/api/auth/authorize?env=${env}`;
  }

  // ── Client Credentials: POST our own endpoint ────────────────────────────
  async function handleClientCredentials(e: React.FormEvent) {
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

      onConnected({
        orgName: data.orgName,
        orgType: data.orgType,
        instanceUrl: data.instanceUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-7">
        <h2 className="text-2xl font-semibold text-sf-neutral-100 mb-1.5">Connect to Salesforce</h2>
        <p className="text-sf-neutral-70 text-sm">
          Choose how to authenticate with your org.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-sf-neutral-30 overflow-hidden mb-7 text-sm">
        <TabButton active={tab === 'oauth'} onClick={() => { setTab('oauth'); setError(null); }}>
          <div className="font-semibold">Login with Salesforce</div>
          <div className={`text-xs ${tab === 'oauth' ? 'text-blue-200' : 'text-sf-neutral-50'}`}>Redirects to Salesforce login</div>
        </TabButton>
        <TabButton active={tab === 'client_credentials'} onClick={() => { setTab('client_credentials'); setError(null); }}>
          <div className="font-semibold">Client Credentials</div>
          <div className={`text-xs ${tab === 'client_credentials' ? 'text-blue-200' : 'text-sf-neutral-50'}`}>Your own Connected App</div>
        </TabButton>
      </div>

      {/* ── OAuth tab ──────────────────────────────────────────────────────── */}
      {tab === 'oauth' && (
        <div className="space-y-5">
          {/* Env toggle */}
          <div>
            <label className="block text-sm font-medium text-sf-neutral-90 mb-2">Environment</label>
            <div className="flex rounded-lg border border-sf-neutral-30 overflow-hidden text-sm">
              <button
                type="button"
                onClick={() => setSandbox(false)}
                className={`flex-1 py-2.5 font-medium transition ${!sandbox ? 'bg-sf-blue text-white' : 'bg-white text-sf-neutral-70 hover:bg-sf-neutral-10'}`}
              >
                Production
              </button>
              <button
                type="button"
                onClick={() => setSandbox(true)}
                className={`flex-1 py-2.5 font-medium transition border-l border-sf-neutral-30 ${sandbox ? 'bg-sf-blue text-white' : 'bg-white text-sf-neutral-70 hover:bg-sf-neutral-10'}`}
              >
                Sandbox
              </button>
            </div>
            <p className="mt-1.5 text-xs text-sf-neutral-70">
              {sandbox
                ? 'Connects to test.salesforce.com'
                : 'Connects to login.salesforce.com'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOAuth}
            className="w-full py-3 px-4 bg-sf-blue hover:bg-sf-blue-dark text-white font-bold rounded-xl
                       transition text-sm flex items-center justify-center gap-3"
          >
            {/* Salesforce cloud icon */}
            <svg className="w-5 h-5" viewBox="0 0 52 35" fill="currentColor">
              <path d="M21.5 0C17.3 0 13.6 2.1 11.4 5.3A10.1 10.1 0 0 0 5.1 3.4C2.3 3.4 0 5.7 0 8.5c0 .5.1 1 .2 1.5A8.5 8.5 0 0 0 0 26.5C0 31.2 3.8 35 8.5 35h34c5.2 0 9.5-4.3 9.5-9.5 0-4.5-3.1-8.2-7.3-9.2.1-.6.2-1.2.2-1.8C44.9 6.9 38 0 29.5 0c-3 0-5.8.9-8 2.4A10.9 10.9 0 0 0 21.5 0z" />
            </svg>
            Login with Salesforce
          </button>

          <p className="text-xs text-center text-sf-neutral-70">
            You&apos;ll be redirected to Salesforce to log in. No credentials are stored in this app.
          </p>
        </div>
      )}

      {/* ── Client Credentials tab ─────────────────────────────────────────── */}
      {tab === 'client_credentials' && (
        <form onSubmit={handleClientCredentials} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-sf-neutral-90 mb-1.5">Salesforce Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="mycompany.my.salesforce.com"
              required
              className={inputCls}
            />
            <p className="mt-1 text-xs text-sf-neutral-70">
              Without <code className="bg-sf-neutral-20 px-1 rounded">https://</code>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-sf-neutral-90 mb-1.5">Consumer Key (Client ID)</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="3MVG9…"
              required
              className={`${inputCls} font-mono`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-sf-neutral-90 mb-1.5">Consumer Secret</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="••••••••••••••••"
              required
              className={`${inputCls} font-mono`}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5">
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
                       text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Connecting…
              </>
            ) : (
              'Connect'
            )}
          </button>
        </form>
      )}
    </div>
  );
}

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100 ' +
  'text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2 focus:ring-sf-blue focus:border-sf-blue transition';

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 px-4 text-left transition ${active ? 'bg-sf-blue' : 'bg-white hover:bg-sf-neutral-10'}`}
    >
      <div className={active ? 'text-white' : 'text-sf-neutral-90'}>{children}</div>
    </button>
  );
}
