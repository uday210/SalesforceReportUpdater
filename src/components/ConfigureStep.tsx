'use client';

import { useState, useMemo } from 'react';
import type { FieldMapping, FieldMappingMode } from '@/lib/reportUtils';
import type { ConnectionInfo } from './ConnectionStep';
import type { SalesforceField } from '@/lib/salesforceClient';

interface MappingRow {
  id: string;
  oldField: SalesforceField | null;
  newField: SalesforceField | null;
  mode: FieldMappingMode;
}

interface Props {
  connection: ConnectionInfo;
  onScan: (fieldMappings: FieldMapping[], targetObjectType: string) => void;
  onDisconnect: () => void;
}

// ── Type badge ─────────────────────────────────────────────────────────────────

function TypeBadge({ type, referenceTo }: { type: string; referenceTo: string[] }) {
  const isLookup = type === 'reference';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
        isLookup
          ? 'bg-purple-100 text-purple-700'
          : 'bg-sf-neutral-20 text-sf-neutral-70'
      }`}
    >
      {isLookup && referenceTo.length > 0 ? `→ ${referenceTo.join(', ')}` : type}
    </span>
  );
}

// ── Field picker dropdown ──────────────────────────────────────────────────────

function FieldDropdown({
  fields,
  value,
  placeholder,
  onChange,
  exclude,
}: {
  fields: SalesforceField[];
  value: SalesforceField | null;
  placeholder: string;
  onChange: (f: SalesforceField | null) => void;
  exclude?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () =>
      fields.filter(
        (f) =>
          f.apiName !== exclude &&
          (f.label.toLowerCase().includes(search.toLowerCase()) ||
            f.apiName.toLowerCase().includes(search.toLowerCase())),
      ),
    [fields, search, exclude],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-sm text-left transition
          ${value
            ? 'border-sf-blue bg-blue-50 text-sf-neutral-100'
            : 'border-sf-neutral-30 bg-white text-sf-neutral-50 hover:border-sf-neutral-50'
          }`}
      >
        <span className="truncate min-w-0">
          {value ? (
            <span className="flex items-center gap-1.5">
              <span className="font-medium truncate">{value.label}</span>
              <span className="font-mono text-xs text-sf-neutral-70 truncate">{value.apiName}</span>
            </span>
          ) : (
            placeholder
          )}
        </span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setSearch(''); }} />
          {/* Dropdown */}
          <div className="absolute z-20 mt-1 w-full min-w-[260px] bg-white border border-sf-neutral-30 rounded-xl shadow-lg overflow-hidden">
            <div className="p-2 border-b border-sf-neutral-30">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search fields…"
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-sf-neutral-30 focus:outline-none focus:ring-2 focus:ring-sf-blue"
              />
            </div>
            <ul className="max-h-56 overflow-y-auto divide-y divide-sf-neutral-20">
              {value && (
                <li>
                  <button
                    type="button"
                    onClick={() => { onChange(null); setOpen(false); setSearch(''); }}
                    className="w-full text-left px-3 py-2 text-sm text-sf-neutral-70 hover:bg-sf-neutral-10 transition"
                  >
                    — Clear selection
                  </button>
                </li>
              )}
              {filtered.length === 0 && (
                <li className="px-3 py-4 text-sm text-sf-neutral-50 text-center">No fields match</li>
              )}
              {filtered.map((f) => (
                <li key={f.apiName}>
                  <button
                    type="button"
                    onClick={() => { onChange(f); setOpen(false); setSearch(''); }}
                    className={`w-full text-left px-3 py-2 hover:bg-sf-neutral-10 transition flex items-center justify-between gap-2 ${
                      value?.apiName === f.apiName ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-sf-neutral-100 truncate">{f.label}</span>
                      <span className="block text-xs font-mono text-sf-neutral-70 truncate">{f.apiName}</span>
                    </span>
                    <TypeBadge type={f.type} referenceTo={f.referenceTo} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ConfigureStep({ connection, onScan, onDisconnect }: Props) {
  const [objectName, setObjectName] = useState('');
  const [fields, setFields] = useState<SalesforceField[] | null>(null);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [fieldsError, setFieldsError] = useState<string | null>(null);

  const [mappings, setMappings] = useState<MappingRow[]>([
    { id: crypto.randomUUID(), oldField: null, newField: null, mode: 'replace' },
  ]);

  // ── Load fields ────────────────────────────────────────────────────────────

  async function loadFields() {
    if (!objectName.trim()) return;
    setFieldsLoading(true);
    setFieldsError(null);
    setFields(null);
    setMappings([{ id: crypto.randomUUID(), oldField: null, newField: null, mode: 'replace' }]);

    try {
      const res = await fetch('/api/salesforce/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: connection.accessToken,
          instanceUrl: connection.instanceUrl,
          objectName: objectName.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to load fields');
      setFields(data.fields as SalesforceField[]);
    } catch (err) {
      setFieldsError(err instanceof Error ? err.message : 'Failed to load fields');
    } finally {
      setFieldsLoading(false);
    }
  }

  // ── Mapping helpers ────────────────────────────────────────────────────────

  function addMapping() {
    setMappings((prev) => [
      ...prev,
      { id: crypto.randomUUID(), oldField: null, newField: null, mode: 'replace' },
    ]);
  }

  function removeMapping(id: string) {
    setMappings((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMapping(id: string, patch: Partial<Omit<MappingRow, 'id'>>) {
    setMappings((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  const validMappings = mappings.filter((m) => m.oldField && m.newField);

  function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (validMappings.length === 0) return;

    const fieldMappings: FieldMapping[] = validMappings.map((m) => ({
      oldField: m.oldField!.apiName,
      newField: m.newField!.apiName,
      mode: m.mode,
    }));

    onScan(fieldMappings, objectName.trim());
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleScan} className="space-y-8">

        {/* ── Step 1: Object name ──────────────────────────────────────────── */}
        <section>
          <h3 className="text-base font-semibold text-sf-neutral-100 mb-1">1. Select Object</h3>
          <p className="text-sm text-sf-neutral-70 mb-3">
            Enter the API name of the object whose fields are changing.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={objectName}
              onChange={(e) => {
                setObjectName(e.target.value);
                setFields(null);
                setFieldsError(null);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadFields(); } }}
              placeholder="e.g. Opportunity or My_Object__c"
              className="flex-1 px-3.5 py-2.5 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100
                         text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2
                         focus:ring-sf-blue focus:border-sf-blue transition font-mono"
            />
            <button
              type="button"
              onClick={loadFields}
              disabled={!objectName.trim() || fieldsLoading}
              className="px-4 py-2.5 rounded-lg bg-sf-neutral-100 hover:bg-sf-neutral-90 disabled:opacity-40
                         disabled:cursor-not-allowed text-white text-sm font-semibold transition shrink-0 flex items-center gap-2"
            >
              {fieldsLoading ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" />
                </svg>
              )}
              Load Fields
            </button>
          </div>

          {fieldsError && (
            <p className="mt-2 text-sm text-sf-red flex items-center gap-1.5">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {fieldsError}
            </p>
          )}

          {fields && (
            <p className="mt-2 text-xs text-sf-green font-medium flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {fields.length} fields loaded from {objectName}
            </p>
          )}
        </section>

        {/* ── Step 2: Field mappings ───────────────────────────────────────── */}
        {fields && (
          <section>
            <h3 className="text-base font-semibold text-sf-neutral-100 mb-1">2. Map Fields</h3>
            <p className="text-sm text-sf-neutral-70 mb-4">
              For each field being replaced, choose the new field and how reports should be updated.
            </p>

            <div className="space-y-3">
              {mappings.map((row, idx) => (
                <MappingRowCard
                  key={row.id}
                  row={row}
                  index={idx}
                  fields={fields}
                  onChange={(patch) => updateMapping(row.id, patch)}
                  onRemove={mappings.length > 1 ? () => removeMapping(row.id) : undefined}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addMapping}
              className="mt-3 flex items-center gap-1.5 text-sm text-sf-blue hover:text-sf-blue-dark font-medium transition"
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add another mapping
            </button>
          </section>
        )}

        {/* ── Scan button ──────────────────────────────────────────────────── */}
        {fields && (
          <button
            type="submit"
            disabled={validMappings.length === 0}
            className="w-full py-3 px-4 bg-sf-blue hover:bg-sf-blue-dark disabled:opacity-40 disabled:cursor-not-allowed
                       text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            Scan Reports ({validMappings.length} mapping{validMappings.length !== 1 ? 's' : ''})
          </button>
        )}
      </form>
    </div>
  );
}

// ── Mapping row card ───────────────────────────────────────────────────────────

interface MappingRowCardProps {
  row: MappingRow;
  index: number;
  fields: SalesforceField[];
  onChange: (patch: Partial<Omit<MappingRow, 'id'>>) => void;
  onRemove?: () => void;
}

function MappingRowCard({ row, index, fields, onChange, onRemove }: MappingRowCardProps) {
  return (
    <div className="border border-sf-neutral-30 rounded-xl p-4 bg-sf-neutral-10 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-sf-neutral-70 uppercase tracking-wide">
          Mapping {index + 1}
        </span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-sf-neutral-50 hover:text-sf-red transition"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
        {/* Old field */}
        <div>
          <label className="block text-xs text-sf-neutral-70 mb-1 font-medium">Old Field</label>
          <FieldDropdown
            fields={fields}
            value={row.oldField}
            placeholder="Select old field…"
            onChange={(f) => onChange({ oldField: f, newField: row.newField?.apiName === f?.apiName ? null : row.newField })}
          />
        </div>

        {/* Arrow */}
        <div className="mt-5">
          <svg className="w-5 h-5 text-sf-neutral-50" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </div>

        {/* New field */}
        <div>
          <label className="block text-xs text-sf-neutral-70 mb-1 font-medium">New Field</label>
          <FieldDropdown
            fields={fields}
            value={row.newField}
            placeholder="Select new field…"
            onChange={(f) => onChange({ newField: f })}
            exclude={row.oldField?.apiName}
          />
        </div>
      </div>

      {/* Mode toggle */}
      <div>
        <label className="block text-xs text-sf-neutral-70 mb-1.5 font-medium">Update Mode</label>
        <div className="flex rounded-lg border border-sf-neutral-30 overflow-hidden w-fit text-sm">
          <ModeButton
            active={row.mode === 'replace'}
            onClick={() => onChange({ mode: 'replace' })}
            label="Replace"
            desc="Swap old field with new field"
            icon={
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            }
          />
          <ModeButton
            active={row.mode === 'keep-both'}
            onClick={() => onChange({ mode: 'keep-both' })}
            label="Keep Both"
            desc="Add new field alongside old field"
            icon={
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            }
          />
        </div>
        <p className="text-xs text-sf-neutral-70 mt-1.5">
          {row.mode === 'replace'
            ? 'Every reference to the old field will be replaced with the new field.'
            : 'The new field will be added right next to the old field. Filters are always replaced.'}
        </p>
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  desc,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={desc}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition ${
        active
          ? 'bg-sf-blue text-white'
          : 'bg-white text-sf-neutral-70 hover:bg-sf-neutral-10'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
