'use client';

import { useState } from 'react';
import type { AuthMethod, ConnectResponseBody } from '@/app/api/auth/connect/route';

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
  const [method, setMethod] = useState<AuthMethod>('client_credentials');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client credentials fields
  const [domain, setDomain] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // Username+password fields (shares clientId/clientSecret)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginUrl, setLoginUrl] = useState('login.salesforce.com');

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const body =
        method === 'client_credentials'
          ? { method, domain, clientId, clientSecret }
          : { method, clientId, clientSecret, username, password, loginUrl };

      const res = await fetch('/api/auth/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
      <div className="mb-7">
        <h2 className="text-2xl font-semibold text-sf-neutral-100 mb-1.5">Connect to Salesforce</h2>
        <p className="text-sf-neutral-70 text-sm leading-relaxed">
          Authenticate with your Salesforce org to get started.
        </p>
      </div>

      {/* Method tabs */}
      <div className="flex rounded-xl border border-sf-neutral-30 overflow-hidden mb-6 text-sm">
        <MethodTab
          active={method === 'client_credentials'}
          onClick={() => { setMethod('client_credentials'); setError(null); }}
          label="Client Credentials"
          desc="Connected App only"
        />
        <MethodTab
          active={method === 'username_password'}
          onClick={() => { setMethod('username_password'); setError(null); }}
          label="Username + Password"
          desc="User login flow"
        />
      </div>

      <form onSubmit={handleConnect} className="space-y-5">

        {/* ── Client Credentials ─────────────────────────────────────────── */}
        {method === 'client_credentials' && (
          <>
            <Field
              label="Salesforce Domain"
              hint={<>Without <code className="bg-sf-neutral-20 px-1 rounded">https://</code> — e.g. <code className="bg-sf-neutral-20 px-1 rounded">mycompany.my.salesforce.com</code></>}
            >
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="mycompany.my.salesforce.com"
                required
                className={inputCls}
              />
            </Field>

            <Field label="Consumer Key (Client ID)">
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="3MVG9…"
                required
                className={`${inputCls} font-mono`}
              />
            </Field>

            <Field label="Consumer Secret (Client Secret)">
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••••••••••"
                required
                className={`${inputCls} font-mono`}
              />
            </Field>
          </>
        )}

        {/* ── Username + Password ────────────────────────────────────────── */}
        {method === 'username_password' && (
          <>
            <Field label="Consumer Key (Client ID)" hint="From your Connected App">
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="3MVG9…"
                required
                className={`${inputCls} font-mono`}
              />
            </Field>

            <Field label="Consumer Secret (Client Secret)" hint="From your Connected App">
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••••••••••"
                required
                className={`${inputCls} font-mono`}
              />
            </Field>

            <Field label="Salesforce Username">
              <input
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@mycompany.com"
                required
                className={inputCls}
              />
            </Field>

            <Field
              label="Password + Security Token"
              hint="Concatenate your password and security token — e.g. MyPassword123TokenABC"
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••••••"
                required
                className={`${inputCls} font-mono`}
              />
            </Field>

            <Field label="Login URL">
              <div className="flex rounded-lg border border-sf-neutral-30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setLoginUrl('login.salesforce.com')}
                  className={`flex-1 py-2 text-sm font-medium transition ${
                    loginUrl === 'login.salesforce.com'
                      ? 'bg-sf-blue text-white'
                      : 'bg-white text-sf-neutral-70 hover:bg-sf-neutral-10'
                  }`}
                >
                  Production
                </button>
                <button
                  type="button"
                  onClick={() => setLoginUrl('test.salesforce.com')}
                  className={`flex-1 py-2 text-sm font-medium transition border-l border-sf-neutral-30 ${
                    loginUrl === 'test.salesforce.com'
                      ? 'bg-sf-blue text-white'
                      : 'bg-white text-sf-neutral-70 hover:bg-sf-neutral-10'
                  }`}
                >
                  Sandbox
                </button>
              </div>
            </Field>
          </>
        )}

        {/* Error */}
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
            'Connect to Salesforce'
          )}
        </button>
      </form>

      {/* Setup help */}
      {method === 'client_credentials' && (
        <details className="mt-7 border border-sf-neutral-30 rounded-xl overflow-hidden">
          <summary className="px-4 py-3 bg-sf-neutral-10 text-sm font-medium text-sf-neutral-90 cursor-pointer">
            How to set up Client Credentials Flow
          </summary>
          <ol className="px-5 py-4 space-y-1.5 text-xs text-sf-neutral-70 list-decimal list-inside">
            <li>Setup → <strong>App Manager</strong> → New Connected App</li>
            <li>Enable <strong>OAuth Settings</strong>, add any callback URL</li>
            <li>Add scopes: <em>Manage user data via APIs (api)</em></li>
            <li>Save, then go to <strong>Manage</strong> → <strong>Edit Policies</strong></li>
            <li>Set IP Relaxation to <em>Relax IP restrictions</em></li>
            <li>Enable <strong>Client Credentials Flow</strong> and set a <strong>Run As</strong> user</li>
            <li>Wait 2–10 min for changes to propagate</li>
          </ol>
        </details>
      )}

      {method === 'username_password' && (
        <details className="mt-7 border border-sf-neutral-30 rounded-xl overflow-hidden">
          <summary className="px-4 py-3 bg-sf-neutral-10 text-sm font-medium text-sf-neutral-90 cursor-pointer">
            How to set up Username + Password Flow
          </summary>
          <ol className="px-5 py-4 space-y-1.5 text-xs text-sf-neutral-70 list-decimal list-inside">
            <li>Setup → <strong>App Manager</strong> → New Connected App</li>
            <li>Enable <strong>OAuth Settings</strong>, add any callback URL</li>
            <li>Add scopes: <em>Manage user data via APIs (api)</em></li>
            <li>Save, then go to <strong>Manage</strong> → <strong>Edit Policies</strong></li>
            <li>Set Permitted Users to <em>All users may self-authorize</em></li>
            <li>Your security token is emailed when you reset it via <strong>My Settings → Reset Security Token</strong></li>
          </ol>
        </details>
      )}
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3.5 py-2.5 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100 ' +
  'text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2 focus:ring-sf-blue focus:border-sf-blue transition';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-sf-neutral-90 mb-1.5">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-sf-neutral-70">{hint}</p>}
    </div>
  );
}

function MethodTab({
  active,
  onClick,
  label,
  desc,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 px-4 text-left transition ${
        active
          ? 'bg-sf-blue text-white'
          : 'bg-white text-sf-neutral-70 hover:bg-sf-neutral-10'
      }`}
    >
      <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-sf-neutral-90'}`}>{label}</div>
      <div className={`text-xs ${active ? 'text-blue-200' : 'text-sf-neutral-50'}`}>{desc}</div>
    </button>
  );
}
