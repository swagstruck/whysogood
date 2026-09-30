'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { copyToClipboard, downloadBlob, readFileAsArrayBuffer, formatFileSize } from '@/lib/utils';
import { hashFileMd5, hashFileSha1, hashFileSha256, hashFileSha512 } from '@/lib/files/engines';
import { Upload, Copy, Download, Trash2, Check, X } from 'lucide-react';

interface FileHashResult {
  id: string;
  name: string;
  size: number;
  md5?: string;
  sha1?: string;
  sha256?: string;
  sha512?: string;
  progress: number;
}

export default function FileHashTool() {
  const [files, setFiles] = useState<FileHashResult[]>([]);
  const [algos, setAlgos] = useState({ md5: true, sha1: true, sha256: true, sha512: true });
  const [compareHash, setCompareHash] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).slice(0, 10 - files.length);
    if (newFiles.length === 0) return;
    
    const initialFiles = newFiles.map(f => ({
      id: Math.random().toString(36).substring(7),
      name: f.name,
      size: f.size,
      progress: 0
    }));
    
    setFiles(prev => [...prev, ...initialFiles]);
    
    for (let i = 0; i < newFiles.length; i++) {
      const f = newFiles[i];
      const id = initialFiles[i].id;
      try {
        const buffer = await readFileAsArrayBuffer(f);
        setFiles(prev => prev.map(p => p.id === id ? { ...p, progress: 50 } : p));
        
        const updates: Partial<FileHashResult> = { progress: 100 };
        if (algos.md5) updates.md5 = await hashFileMd5(buffer);
        if (algos.sha1) updates.sha1 = await hashFileSha1(buffer);
        if (algos.sha256) updates.sha256 = await hashFileSha256(buffer);
        if (algos.sha512) updates.sha512 = await hashFileSha512(buffer);
        
        setFiles(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
      } catch (err) {
        toast.error('Error hashing file');
      }
    }
  };

  const handleDownloadReport = () => {
    let report = 'File Hash Report\n================\n\n';
    files.forEach(f => {
      report += `File: ${f.name}\nSize: ${formatFileSize(f.size)}\n`;
      if (f.md5) report += `MD5: ${f.md5}\n`;
      if (f.sha1) report += `SHA-1: ${f.sha1}\n`;
      if (f.sha256) report += `SHA-256: ${f.sha256}\n`;
      if (f.sha512) report += `SHA-512: ${f.sha512}\n`;
      report += '\n';
    });
    const blob = new Blob([report], { type: 'text/plain' });
    downloadBlob(blob, 'hash_report.txt');
  };

  const checkMatch = (hash?: string) => {
    if (!compareHash || !hash) return null;
    return hash.toLowerCase() === compareHash.toLowerCase().trim();
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">Algorithms</h2>
        <div className="flex gap-4">
          {['md5', 'sha1', 'sha256', 'sha512'].map(algo => (
            <label key={algo} className="flex items-center gap-2">
              <input type="checkbox" checked={algos[algo as keyof typeof algos]} onChange={e => setAlgos(prev => ({ ...prev, [algo]: e.target.checked }))} />
              <span className="uppercase text-sm">{algo.replace('sha', 'sha-')}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">Compare Hash (Optional)</h2>
        <input 
          type="text" 
          placeholder="Paste known hash to verify against..." 
          className="w-full p-2 border rounded" 
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)', color: 'var(--color-text)' }}
          value={compareHash} 
          onChange={e => setCompareHash(e.target.value)} 
        />
      </div>

      <div className="card space-y-4 text-center border-dashed border-2 p-8" onClick={() => fileInputRef.current?.click()} style={{ borderColor: 'var(--color-border)', cursor: 'pointer' }}>
        <Upload className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--color-muted)' }} />
        <p>Click to upload up to 10 files</p>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Results</h2>
            <div className="flex gap-2">
              <Button onClick={handleDownloadReport} variant="secondary" icon={<Download size={16} />}>Download Report</Button>
              <Button onClick={() => setFiles([])} variant="danger" icon={<Trash2 size={16} />}>Clear All</Button>
            </div>
          </div>
          
          {files.map(f => (
            <div key={f.id} className="card space-y-2">
              <div className="flex justify-between font-medium">
                <span>{f.name}</span>
                <span style={{ color: 'var(--color-muted)' }}>{formatFileSize(f.size)}</span>
              </div>
              {f.progress < 100 && (
                <div className="h-2 w-full rounded overflow-hidden mt-2" style={{ backgroundColor: 'var(--color-surface2)' }}>
                  <div className="h-full" style={{ width: `${f.progress}%`, backgroundColor: 'var(--color-accent)' }}></div>
                </div>
              )}
              {f.progress === 100 && ['md5', 'sha1', 'sha256', 'sha512'].filter(a => algos[a as keyof typeof algos]).map(algo => {
                const h = f[algo as keyof FileHashResult] as string;
                if (!h) return null;
                const match = checkMatch(h);
                return (
                  <div key={algo} className="flex flex-col gap-1 mt-4">
                    <div className="flex justify-between text-xs font-semibold uppercase" style={{ color: 'var(--color-muted)' }}>
                      <span>{algo.replace('sha', 'sha-')}</span>
                      {match !== null && (
                        <span style={{ color: match ? 'var(--color-success)' : 'red' }}>
                          {match ? <Check size={14} className="inline mr-1"/> : <X size={14} className="inline mr-1"/>}
                          {match ? 'Match' : 'Mismatch'}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <code className="flex-1 p-2 rounded break-all text-sm" style={{ backgroundColor: 'var(--color-surface2)', fontFamily: 'var(--font-mono)' }}>
                        {h}
                      </code>
                      <Button variant="ghost" size="sm" onClick={() => { copyToClipboard(h); toast.success('Copied to clipboard'); }} icon={<Copy size={16}/>}>Copy</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
