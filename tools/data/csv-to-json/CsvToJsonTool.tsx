'use client';
import React, { useState } from 'react';
import { Download, Copy, Check, Table as TableIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob } from '@/lib/utils';

// Simple RFC 4180 compliant CSV parser
function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\r') {
        // Skip CR
      } else if (char === '\n') {
        currentRow.push(currentVal.trim());
        if (currentRow.some(val => val.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(val => val.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export default function CsvToJsonTool() {
  const [csvInput, setCsvInput] = useState('');
  const [jsonOutput, setJsonOutput] = useState('');
  const [hasHeaders, setHasHeaders] = useState(true);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [activeTab, setActiveTab] = useState<'json' | 'preview'>('json');
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleConvert = (textToConvert = csvInput) => {
    if (!textToConvert.trim()) {
      setJsonOutput('');
      setPreviewRows([]);
      return;
    }

    try {
      const parsed = parseCsv(textToConvert);
      setPreviewRows(parsed.slice(0, 10)); // preview first 10 rows

      if (!parsed.length) {
        setJsonOutput('[]');
        return;
      }

      if (hasHeaders && parsed.length > 1) {
        const headers = parsed[0];
        const dataRows = parsed.slice(1);
        const jsonResult = dataRows.map(row => {
          const obj: Record<string, string | number> = {};
          headers.forEach((header, index) => {
            const val = row[index] !== undefined ? row[index] : '';
            // If numeric, attempt to cast
            const num = Number(val);
            obj[header || `col_${index + 1}`] = !isNaN(num) && val !== '' ? num : val;
          });
          return obj;
        });
        setJsonOutput(JSON.stringify(jsonResult, null, 2));
      } else {
        setJsonOutput(JSON.stringify(parsed, null, 2));
      }
    } catch {
      toast.error('Failed to parse CSV');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      setCsvInput(content);
      handleConvert(content);
    };
    reader.readAsText(file);
  };

  const loadSample = () => {
    const sample = `name,email,role,salary\nJohn Doe,john@example.com,Developer,85000\nJane Smith,jane@example.com,Designer,78000\nBob Johnson,bob@example.com,Product Manager,92000`;
    setCsvInput(sample);
    handleConvert(sample);
  };

  const handleCopy = async () => {
    if (!jsonOutput) return;
    await copyToClipboard(jsonOutput);
    setCopied(true);
    toast.success('JSON copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!jsonOutput) return;
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    downloadBlob(blob, 'converted_data.json');
    toast.success('Downloaded converted_data.json');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Controls */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button onClick={() => handleConvert()}>Convert to JSON</Button>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-text)', cursor: 'pointer', margin: '0 8px' }}>
            <input
              type="checkbox"
              checked={hasHeaders}
              onChange={e => {
                setHasHeaders(e.target.checked);
                setTimeout(() => handleConvert(), 50);
              }}
            />
            First row contains headers
          </label>
          <Button variant="ghost" size="sm" onClick={loadSample}>Sample CSV</Button>
          <label>
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            <span className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', height: 32, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>
              Upload CSV
            </span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={handleCopy} disabled={!jsonOutput} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
            {copied ? 'Copied' : 'Copy JSON'}
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownload} disabled={!jsonOutput} icon={<Download size={14} />}>
            Download JSON
          </Button>
        </div>
      </div>

      {/* Editor Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* CSV Input */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', fontSize: 12, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase' }}>
            CSV Input
          </div>
          <textarea
            value={csvInput}
            onChange={e => {
              setCsvInput(e.target.value);
              handleConvert(e.target.value);
            }}
            placeholder="Paste CSV text here or upload a file above..."
            style={{
              width: '100%', height: 380, padding: 14,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 13,
              resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
            }}
          />
        </div>

        {/* JSON Output / Preview Tab */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setActiveTab('json')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  color: activeTab === 'json' ? 'var(--color-accent)' : 'var(--color-muted)',
                  borderBottom: activeTab === 'json' ? '2px solid var(--color-accent)' : 'none',
                  paddingBottom: 2, textTransform: 'uppercase',
                }}
              >
                JSON Output
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700,
                  color: activeTab === 'preview' ? 'var(--color-accent)' : 'var(--color-muted)',
                  borderBottom: activeTab === 'preview' ? '2px solid var(--color-accent)' : 'none',
                  paddingBottom: 2, textTransform: 'uppercase',
                }}
              >
                Table Preview
              </button>
            </div>
            {jsonOutput && <span style={{ fontSize: 11, color: 'var(--color-faint)' }}>{previewRows.length} rows</span>}
          </div>

          {activeTab === 'json' ? (
            <textarea
              readOnly
              value={jsonOutput}
              placeholder="JSON output will appear here..."
              style={{
                width: '100%', height: 380, padding: 14,
                background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--color-text)', fontFamily: 'var(--font-mono)', fontSize: 13,
                resize: 'none', boxSizing: 'border-box', lineHeight: 1.5,
              }}
            />
          ) : (
            <div style={{ width: '100%', height: 380, overflow: 'auto', padding: 12, boxSizing: 'border-box' }}>
              {previewRows.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                  <thead>
                    <tr>
                      {previewRows[0].map((cell, idx) => (
                        <th key={idx} style={{ padding: '8px 10px', borderBottom: '2px solid var(--color-border)', color: 'var(--color-accent)' }}>
                          {hasHeaders ? cell : `Col ${idx + 1}`}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(hasHeaders ? previewRows.slice(1) : previewRows).map((row, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} style={{ padding: '8px 10px', color: 'var(--color-text)' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ color: 'var(--color-muted)', padding: 20, textAlign: 'center' }}>No data to preview</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
