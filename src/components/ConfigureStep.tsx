'use client';

import { useState } from 'react';
import type { FieldMapping } from '@/lib/reportUtils';
import type { ConnectionInfo } from './ConnectionStep';

interface Props {
  connection: ConnectionInfo;
  onScan: (fieldMappings: FieldMapping[], targetObjectType: string) => void;
  onDisconnect: () => void;
}

const EXAMPLE_OBJECTS = [
  'Opportunity',
  'Account',
  'Contact',
  'Lead',
  'Case',
  'Custom_Object__c',
];

export default function ConfigureStep({ connection, onScan, onDisconnect }: Props) {
  const [targetObjectType, setTargetObjectType] = useState('');
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([
    { oldField: '', newField: '' },
  ]);

  function addMapping() {
    setFieldMappings((prev) => [...prev, { oldField: '', newField: '' }]);
  }

  function removeMapping(index: number) {
    setFieldMappings((prev) => prev.filter((_, i) => i !== index));
  }

  function updateMapping(index: number, key: keyof FieldMapping, value: string) {
    setFieldMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [key]: value } : m)),
    );
  }

  const validMappings = fieldMappings.filter((m) => m.oldField.trim() && m.newField.trim());
  const canScan = validMappings.length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (canScan) onScan(validMappings, targetObjectType.trim());
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Connected org badge */}
      <div className="flex items-center justify-between mb-8 p-3.5 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-sf-green" />
          <span className="text-sm font-medium text-sf-neutral-90">
            Connected to <strong>{connection.orgName}</strong>
          </span>
          <span className="text-xs text-sf-neutral-70 truncate max-w-xs">{connection.instanceUrl}</span>
        </div>
        <button
          onClick={onDisconnect}
          className="text-xs text-sf-neutral-70 hover:text-sf-red transition"
        >
          Disconnect
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-sf-neutral-100 mb-2">Configure the Scan</h2>
        <p className="text-sf-neutral-70 text-sm leading-relaxed">
          Specify which object&apos;s reports to scan and define the field mappings — old field API
          names that should be replaced with new ones.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-7">
        {/* Target Object */}
        <div>
          <label className="block text-sm font-medium text-sf-neutral-90 mb-1.5">
            Target Object API Name{' '}
            <span className="text-sf-neutral-50 font-normal">(optional — leave blank to scan all reports)</span>
          </label>
          <input
            type="text"
            value={targetObjectType}
            onChange={(e) => setTargetObjectType(e.target.value)}
            placeholder="Opportunity"
            list="object-suggestions"
            className="w-full px-3.5 py-2.5 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100
                       text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2
                       focus:ring-sf-blue focus:border-sf-blue transition font-mono"
          />
          <datalist id="object-suggestions">
            {EXAMPLE_OBJECTS.map((o) => <option key={o} value={o} />)}
          </datalist>
          <p className="mt-1 text-xs text-sf-neutral-70">
            When specified, only reports whose <strong>primary object type</strong> matches this
            value are scanned.
          </p>
        </div>

        {/* Field Mappings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-sf-neutral-90">
              Field Mappings
              <span className="ml-1.5 text-xs text-sf-neutral-70 font-normal">
                (old field → new field, API names)
              </span>
            </label>
          </div>

          {/* Header row */}
          <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 mb-2 px-1">
            <span className="text-xs font-semibold text-sf-neutral-70 uppercase tracking-wide">Old Field API Name</span>
            <span />
            <span className="text-xs font-semibold text-sf-neutral-70 uppercase tracking-wide">New Field API Name</span>
            <span />
          </div>

          <div className="space-y-2.5">
            {fieldMappings.map((mapping, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center">
                <input
                  type="text"
                  value={mapping.oldField}
                  onChange={(e) => updateMapping(idx, 'oldField', e.target.value)}
                  placeholder="OLD_LOOKUP__C"
                  className="px-3 py-2 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100
                             text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2
                             focus:ring-sf-blue focus:border-sf-blue transition font-mono"
                />
                <div className="flex items-center text-sf-neutral-50">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={mapping.newField}
                  onChange={(e) => updateMapping(idx, 'newField', e.target.value)}
                  placeholder="NEW_LOOKUP__C"
                  className="px-3 py-2 rounded-lg border border-sf-neutral-30 bg-white text-sf-neutral-100
                             text-sm placeholder:text-sf-neutral-50 focus:outline-none focus:ring-2
                             focus:ring-sf-blue focus:border-sf-blue transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => removeMapping(idx)}
                  disabled={fieldMappings.length === 1}
                  className="p-1.5 text-sf-neutral-50 hover:text-sf-red disabled:opacity-30 disabled:cursor-not-allowed transition rounded"
                  title="Remove mapping"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addMapping}
            className="mt-3 flex items-center gap-1.5 text-sm text-sf-blue hover:text-sf-blue-dark transition font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add another mapping
          </button>
        </div>

        {/* Info callout */}
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-sf-neutral-70 leading-relaxed">
          <p className="font-semibold text-sf-neutral-90 mb-1">What gets scanned?</p>
          <p>
            The scanner checks report <strong>columns</strong>, <strong>filters</strong>, and{' '}
            <strong>row/column groupings</strong> for references to the old fields. Fields can appear
            with or without an object prefix (e.g.{' '}
            <code className="bg-blue-100 px-1 rounded">OPPORTUNITY.OLD_LOOKUP__C</code> or{' '}
            <code className="bg-blue-100 px-1 rounded">OLD_LOOKUP__C</code>) — both are detected.
          </p>
        </div>

        <button
          type="submit"
          disabled={!canScan}
          className="w-full py-2.5 px-4 bg-sf-blue hover:bg-sf-blue-dark disabled:opacity-50
                     disabled:cursor-not-allowed text-white font-semibold rounded-lg transition text-sm
                     flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          Scan Reports
        </button>
      </form>
    </div>
  );
}
