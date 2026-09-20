'use client';
import React, { useState, useRef } from 'react';
import { Info, Copy, Check, Image as ImageIcon, Camera, MapPin, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatFileSize, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';

interface MetaEntry {
  category: string;
  label: string;
  value: string;
}

// Basic pure client-side EXIF parser for JPEG files
function extractJpegExif(buffer: ArrayBuffer): MetaEntry[] {
  const entries: MetaEntry[] = [];
  const dv = new DataView(buffer);

  if (dv.getUint16(0) !== 0xffd8) return entries; // Not JPEG

  let offset = 2;
  while (offset < dv.byteLength - 2) {
    const marker = dv.getUint16(offset);
    offset += 2;
    if (marker === 0xffe1) {
      // APP1 Exif Marker
      const length = dv.getUint16(offset);
      const exifHeader = dv.getUint32(offset + 2);
      if (exifHeader === 0x45786966) {
        // "Exif"
        entries.push({ category: 'EXIF', label: 'EXIF Header', value: 'Present (TIFF structure)' });
        const tiffOffset = offset + 8;
        const littleEndian = dv.getUint16(tiffOffset) === 0x4949;
        const ifdOffset = dv.getUint32(tiffOffset + 4, littleEndian);
        let curOffset = tiffOffset + ifdOffset;

        if (curOffset < dv.byteLength) {
          const numEntries = dv.getUint16(curOffset, littleEndian);
          curOffset += 2;

          for (let i = 0; i < Math.min(numEntries, 40); i++) {
            const entryOffset = curOffset + i * 12;
            if (entryOffset + 12 > dv.byteLength) break;
            const tag = dv.getUint16(entryOffset, littleEndian);

            // Match common EXIF tags
            if (tag === 0x010f) {
              entries.push({ category: 'Camera', label: 'Make', value: readString(dv, entryOffset, tiffOffset, littleEndian) });
            } else if (tag === 0x0110) {
              entries.push({ category: 'Camera', label: 'Model', value: readString(dv, entryOffset, tiffOffset, littleEndian) });
            } else if (tag === 0x0131) {
              entries.push({ category: 'Camera', label: 'Software', value: readString(dv, entryOffset, tiffOffset, littleEndian) });
            } else if (tag === 0x0132) {
              entries.push({ category: 'Date/Time', label: 'Modified Date', value: readString(dv, entryOffset, tiffOffset, littleEndian) });
            } else if (tag === 0x9003) {
              entries.push({ category: 'Date/Time', label: 'Original Date', value: readString(dv, entryOffset, tiffOffset, littleEndian) });
            } else if (tag === 0x8827) {
              entries.push({ category: 'Settings', label: 'ISO Speed', value: String(dv.getUint16(entryOffset + 8, littleEndian)) });
            }
          }
        }
      }
      break;
    } else if ((marker & 0xff00) === 0xff00) {
      const len = dv.getUint16(offset);
      offset += len;
    } else {
      break;
    }
  }

  return entries;
}

function readString(dv: DataView, entryOffset: number, tiffOffset: number, littleEndian: boolean): string {
  const count = dv.getUint32(entryOffset + 4, littleEndian);
  let valueOffset = dv.getUint32(entryOffset + 8, littleEndian);
  if (count <= 4) valueOffset = entryOffset + 8;
  else valueOffset = tiffOffset + valueOffset;

  let str = '';
  for (let i = 0; i < Math.min(count, 100); i++) {
    if (valueOffset + i >= dv.byteLength) break;
    const charCode = dv.getUint8(valueOffset + i);
    if (charCode === 0) break;
    str += String.fromCharCode(charCode);
  }
  return str.trim() || 'Unknown';
}

export default function ImageMetadataViewerTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [entries, setEntries] = useState<MetaEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const handleFile = async (f: File | null) => {
    if (!f) return;
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);

    const baseEntries: MetaEntry[] = [
      { category: 'File', label: 'Filename', value: f.name },
      { category: 'File', label: 'File Size', value: formatFileSize(f.size) },
      { category: 'File', label: 'MIME Type', value: f.type || 'Unknown' },
      { category: 'File', label: 'Last Modified', value: new Date(f.lastModified).toLocaleString() },
    ];

    const img = new Image();
    img.onload = async () => {
      baseEntries.push(
        { category: 'Dimensions', label: 'Width', value: `${img.naturalWidth} px` },
        { category: 'Dimensions', label: 'Height', value: `${img.naturalHeight} px` },
        { category: 'Dimensions', label: 'Aspect Ratio', value: `${(img.naturalWidth / img.naturalHeight).toFixed(2)}:1` },
        { category: 'Dimensions', label: 'Megapixels', value: `${((img.naturalWidth * img.naturalHeight) / 1_000_000).toFixed(2)} MP` }
      );

      try {
        const buffer = await f.arrayBuffer();
        const exifData = extractJpegExif(buffer);
        setEntries([...baseEntries, ...exifData]);
      } catch {
        setEntries(baseEntries);
      }
    };
    img.src = url;
  };

  const handleCopy = async () => {
    if (!entries.length) return;
    const text = entries.map(e => `${e.category} > ${e.label}: ${e.value}`).join('\n');
    await copyToClipboard(text);
    setCopied(true);
    toast.success('Metadata copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--color-surface)',
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0] || null)} />
          <div style={{
            width: 52, height: 52, borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent-subtle)', color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
          }}>
            <Info size={26} />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: 'var(--color-text)' }}>
            Choose an image to view metadata
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-muted)', margin: 0 }}>
            Inspect EXIF, camera settings, dimensions, and file info &bull; 100% Client-side
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Metadata Table */}
          <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                Extracted Metadata
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={handleCopy} icon={copied ? <Check size={14} /> : <Copy size={14} />}>
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Change</Button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '8px 10px', color: 'var(--color-muted)', fontWeight: 500, width: '40%' }}>
                        {entry.label}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--color-text)', fontWeight: 600 }}>
                        {entry.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Preview */}
          <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: '100%', maxHeight: 340, borderRadius: 'var(--radius-md)', overflow: 'hidden',
              background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl || ''}
                alt="Uploaded preview"
                style={{ maxWidth: '100%', maxHeight: 340, objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
