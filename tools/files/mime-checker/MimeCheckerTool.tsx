'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { readFileAsArrayBuffer } from '@/lib/utils';
import { detectMimeBySignature, MimeDetectionResult } from '@/lib/files/engines';
import { Upload, Search, Check, AlertTriangle } from 'lucide-react';

export default function MimeCheckerTool() {
  const [result, setResult] = useState<MimeDetectionResult | null>(null);
  const [reportedMime, setReportedMime] = useState<string>('');
  const [reportedExt, setReportedExt] = useState<string>('');
  const [lookup, setLookup] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setReportedMime(file.type || 'unknown');
    setReportedExt(file.name.split('.').pop()?.toLowerCase() || '');
    
    const buffer = await readFileAsArrayBuffer(file);
    const det = detectMimeBySignature(buffer);
    setResult(det);
  };

  const extMatch = result && reportedExt ? result.extension === reportedExt || (result.extension === 'jpg' && reportedExt === 'jpeg') : false;

  return (
    <div className="space-y-6">
      <div className="card space-y-4 text-center border-dashed border-2 p-8" onClick={() => fileInputRef.current?.click()} style={{ borderColor: 'var(--color-border)', cursor: 'pointer' }}>
        <Upload className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--color-muted)' }} />
        <p>Click or drag to upload a file to check its real MIME type</p>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
      </div>

      {result && (
        <div className="card space-y-6">
          <h2 className="text-lg font-semibold">Detection Results</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-sm font-semibold uppercase mb-1" style={{ color: 'var(--color-muted)' }}>Detected MIME Type</div>
              <div className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>{result.detected}</div>
              <div className="mt-2 text-sm flex items-center gap-2">
                Confidence: 
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${result.confidence === 'high' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {result.confidence}
                </span>
              </div>
            </div>

            <div className="p-4 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-sm font-semibold uppercase mb-1" style={{ color: 'var(--color-muted)' }}>Reported MIME Type</div>
              <div className="text-xl font-bold">{reportedMime || 'N/A'}</div>
              <div className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>From browser (file.type)</div>
            </div>

            <div className="p-4 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-sm font-semibold uppercase mb-1" style={{ color: 'var(--color-muted)' }}>Format Description</div>
              <div className="font-medium">{result.description}</div>
            </div>

            <div className="p-4 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-sm font-semibold uppercase mb-1" style={{ color: 'var(--color-muted)' }}>Extension Check</div>
              <div className="flex items-center gap-2 mt-1">
                {extMatch ? (
                  <span className="flex items-center font-semibold" style={{ color: 'var(--color-success)' }}><Check size={18} className="mr-1"/> Match</span>
                ) : (
                  <span className="text-red-500 flex items-center font-semibold"><AlertTriangle size={18} className="mr-1"/> Mismatch</span>
                )}
                <span className="text-sm" style={{ color: 'var(--color-muted)' }}>({reportedExt || 'none'} vs {result.extension})</span>
              </div>
            </div>

            <div className="p-4 rounded md:col-span-2" style={{ backgroundColor: 'var(--color-surface2)' }}>
              <div className="text-sm font-semibold uppercase mb-2" style={{ color: 'var(--color-muted)' }}>First 16 Bytes (Hex Signature)</div>
              <code className="block p-2 rounded text-sm break-all font-mono" style={{ backgroundColor: 'var(--color-surface2)', filter: 'brightness(0.95)', fontFamily: 'var(--font-mono)' }}>
                {result.headerBytes}
              </code>
            </div>
          </div>
        </div>
      )}

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Search size={20}/> MIME Lookup</h2>
        <input 
          type="text" 
          placeholder="e.g., application/pdf or pdf" 
          className="w-full p-2 border rounded" 
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)', color: 'var(--color-text)' }}
          value={lookup} 
          onChange={e => setLookup(e.target.value)} 
        />
        {lookup && (
          <div className="text-sm p-3 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
            Search results for "{lookup}" not found in offline DB.
          </div>
        )}
      </div>
    </div>
  );
}
