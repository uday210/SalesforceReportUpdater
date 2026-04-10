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

  // Client credentials
  const [domain, setDomain] = useState('');

  // Username + password
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
          ? { method, domain }
          : { method, username, password, loginUrl };

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
    <div className="max-w-md mx-auto">
      <div className="mb-7">
        <h2 className="text-2xl font-semibold text-sf-neutral-100 mb-1.5">Connect to Salesforce</h2>
        <p className="text-sf-neutral-70 text-sm leading-relaxed">
          Choose how you want to authenticate with your org.
        </p>
      </div>

      {/* Method tabs */}
      <div className="flex rounded-xl border border-sf-neutral-30 overflow-hidden mb-6 text-sm">
        <MethodTab
          active={method === 'client_credentials'}
          onClick={() => { setMethod('client_credentials'); setError(null); }}
          label="Client Credentials"
          desc="Service / integration user"
        />
        <MethodTab
          active={method === 'username_password'}
          onClick={() => { setMethod('username_password'); setError(null); }}
          label="Username + Password"
          desc="Named user login"
        />
      </div>

      <form onSubmit={handleConnect} className="space-y-5">

        {/* ── Client Credentials ─────────────────────────────────────────── */}
        {method === 'client_credentials' && (
          <Field
            label="Salesforce Domain"
            hint={
              <>
                Without <code className="bg-sf-neutral-20 px-1 rounded">https://</code> — e.g.{' '}
                <code className="bg-sf-neutral-20 px-1 rounded">mycompany.my.salesforce.com</code>
              </>
            }
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
        )}

        {/* ── Username + Password ────────────────────────────────────────── */}
        {method === 'username_password' && (
          <>
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
              hint="Append your security token directly to your password — e.g. MyPassword123TokenABC"
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

            <Field label="Environment">
              <div className="flex rounded-lg border border-sf-neutral-30 overflow-hidden">
                <EnvButton
                  active={loginUrl === 'login.salesforce.com'}
                  onClick={() => setLoginUrl('login.salesforce.com')}
                  label="Production"
                />
                <EnvButton
                  active={loginUrl === 'test.salesforce.com'}
                  onClick={() => setLoginUrl('test.salesforce.com')}
                  label="Sandbox"
                  border
                />
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

      {/* Help text */}
      {method === 'username_password' && (
        <p className="mt-5 text-xs text-sf-neutral-70 leading-relaxed">
          Don&apos;t have your security token?{' '}
          <span className="text-sf-neutral-90 font-medium">
            My Settings → Personal → Reset My Security Token
          </span>{' '}
          in Salesforce — it will be emailed to you.
        </p>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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
        active ? 'bg-sf-blue' : 'bg-white hover:bg-sf-neutral-10'
      }`}
    >
      <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-sf-neutral-90'}`}>
        {label}
      </div>
      <div className={`text-xs ${active ? 'text-blue-200' : 'text-sf-neutral-50'}`}>{desc}</div>
    </button>
  );
}

function EnvButton({
  active,
  onClick,
  label,
  border,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  border?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-2 text-sm font-medium transition ${
        border ? 'border-l border-sf-neutral-30' : ''
      } ${active ? 'bg-sf-blue text-white' : 'bg-white text-sf-neutral-70 hover:bg-sf-neutral-10'}`}
    >
      {label}
    </button>
  );
}
