'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { downloadBlob, readFileAsArrayBuffer, formatFileSize } from '@/lib/utils';
import { Upload, Trash2, Package } from 'lucide-react';
import { zip, Zippable } from 'fflate';

interface ZipFileItem {
  id: string;
  file: File;
  path: string;
}

export default function ZipCreatorTool() {
  const [files, setFiles] = useState<ZipFileItem[]>([]);
  const [folderPrefix, setFolderPrefix] = useState<string>('');
  const [compression, setCompression] = useState<string>('6');
  const [filename, setFilename] = useState<string>('archive.zip');
  const [isZipping, setIsZipping] = useState(false);
  const [result, setResult] = useState<{ size: number, ratio: number } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map(f => ({
      id: Math.random().toString(36).substring(7),
      file: f,
      path: f.name
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleCreateZip = async () => {
    if (files.length === 0) return;
    setIsZipping(true);
    setResult(null);

    try {
      const zippable: Zippable = {};
      let totalInputSize = 0;

      for (const item of files) {
        totalInputSize += item.file.size;
        const buffer = await readFileAsArrayBuffer(item.file);
        const uint8 = new Uint8Array(buffer);
        const fullPath = folderPrefix ? `${folderPrefix.replace(/\/+$/, '')}/${item.path}` : item.path;
        zippable[fullPath] = uint8;
      }

      zip(zippable, { level: parseInt(compression, 10) as any }, (err, data) => {
        setIsZipping(false);
        if (err) {
          toast.success('Failed to create ZIP');
          return;
        }

        const blob = new Blob([data], { type: 'application/zip' });
        downloadBlob(blob, filename || 'archive.zip');
        
        setResult({
          size: data.length,
          ratio: totalInputSize > 0 ? ((totalInputSize - data.length) / totalInputSize * 100) : 0
        });
        toast.success('ZIP created successfully!');
      });
    } catch (error) {
      setIsZipping(false);
      toast.error('Error reading files');
    }
  };

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <h2 className="text-lg font-semibold">ZIP Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Output Filename</label>
            <input 
              type="text" 
              className="w-full p-2 border rounded" 
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)', color: 'var(--color-text)' }}
              value={filename} 
              onChange={e => setFilename(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Folder Prefix (Optional)</label>
            <input 
              type="text" 
              placeholder="e.g. my-folder/"
              className="w-full p-2 border rounded" 
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)', color: 'var(--color-text)' }}
              value={folderPrefix} 
              onChange={e => setFolderPrefix(e.target.value)} 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Compression Level</label>
            <select 
              className="w-full p-2 border rounded" 
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface2)', color: 'var(--color-text)' }}
              value={compression} 
              onChange={e => setCompression(e.target.value)}
            >
              <option value="0">No compression (0)</option>
              <option value="1">Fast (1)</option>
              <option value="6">Default (6)</option>
              <option value="9">Best (9)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card space-y-4 text-center border-dashed border-2 p-8" onClick={() => fileInputRef.current?.click()} style={{ borderColor: 'var(--color-border)', cursor: 'pointer' }}>
        <Upload className="mx-auto h-8 w-8 mb-2" style={{ color: 'var(--color-muted)' }} />
        <p>Click or drag to add files to archive</p>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
      </div>

      {files.length > 0 && (
        <div className="card space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Files ({files.length})</h2>
            <Button onClick={() => setFiles([])} variant="danger" size="sm">Clear All</Button>
          </div>
          
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
            {files.map(f => (
              <div key={f.id} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'var(--color-surface2)' }}>
                <div className="truncate flex-1 font-medium text-sm">
                  {folderPrefix ? `${folderPrefix.replace(/\/+$/, '')}/` : ''}{f.path}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{formatFileSize(f.file.size)}</span>
                  <Button variant="ghost" size="sm" onClick={() => removeFile(f.id)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t flex justify-between items-center" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              {result && (
                <div className="text-sm">
                  <span style={{ color: 'var(--color-muted)' }}>Output Size:</span> <span className="font-medium">{formatFileSize(result.size)}</span>
                  <span className="ml-4" style={{ color: 'var(--color-muted)' }}>Compression:</span> <span className="font-medium">{result.ratio.toFixed(1)}% saved</span>
                </div>
              )}
            </div>
            <Button onClick={handleCreateZip} disabled={isZipping} icon={<Package size={16} />}>
              {isZipping ? 'Creating ZIP...' : 'Create ZIP Archive'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
