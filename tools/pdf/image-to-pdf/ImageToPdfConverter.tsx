'use client';
import React, { useState, useRef } from 'react';
import { PDFDocument, degrees } from 'pdf-lib';
import { ImagePlus, Download, Trash2, ArrowLeft, ArrowRight, RotateCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { downloadBlob, formatFileSize } from '@/lib/utils';

interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  rotation: number;
}

interface ImageToPdfConverterProps {
  acceptedFormats: string;
  title: string;
  description: string;
  defaultOutputName?: string;
}

export function ImageToPdfConverter({
  acceptedFormats,
  title,
  description,
  defaultOutputName = 'converted_images.pdf',
}: ImageToPdfConverterProps) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [orientation, setOrientation] = useState<'auto' | 'portrait' | 'landscape'>('auto');
  const [pageSize, setPageSize] = useState<'fit' | 'a4' | 'letter'>('fit');
  const [margin, setMargin] = useState<number>(0);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList | File[]) => {
    setError(null);
    const newItems: ImageItem[] = [];

    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      const previewUrl = URL.createObjectURL(f);
      const img = new Image();
      img.src = previewUrl;
      await new Promise<void>(resolve => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });

      newItems.push({
        id: `${f.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        file: f,
        previewUrl,
        width: img.width || 800,
        height: img.height || 600,
        rotation: 0,
      });
    }

    if (newItems.length === 0) {
      setError('Please select valid image files.');
      return;
    }

    setImages(prev => [...prev, ...newItems]);
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setImages(prev => {
      const copy = [...prev];
      const target = direction === 'left' ? index - 1 : index + 1;
      if (target < 0 || target >= copy.length) return prev;
      const [removed] = copy.splice(index, 1);
      copy.splice(target, 0, removed);
      return copy;
    });
  };

  const rotateImage = (id: string) => {
    setImages(prev =>
      prev.map(item =>
        item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item
      )
    );
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(item => item.id !== id));
  };

  const convertToPdf = async () => {
    if (images.length === 0) return;
    setIsConverting(true);
    setError(null);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const item of images) {
        // Load image onto canvas to handle rotation and ensure clean PNG/JPEG buffer
        const canvas = document.createElement('canvas');
        const img = new Image();
        img.src = item.previewUrl;
        await new Promise(r => { img.onload = r; });

        const isRotated90 = item.rotation % 180 !== 0;
        const naturalWidth = isRotated90 ? img.height : img.width;
        const naturalHeight = isRotated90 ? img.width : img.height;

        canvas.width = naturalWidth;
        canvas.height = naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((item.rotation * Math.PI) / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const pngBlob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
        if (!pngBlob) continue;

        const pngBytes = await pngBlob.arrayBuffer();
        const embeddedImage = await pdfDoc.embedPng(pngBytes);

        // Determine Page Dimensions
        let pageWidth: number;
        let pageHeight: number;

        if (pageSize === 'a4') {
          // A4 in points: 595.28 x 841.89
          pageWidth = 595.28;
          pageHeight = 841.89;
        } else if (pageSize === 'letter') {
          // US Letter: 612 x 792
          pageWidth = 612;
          pageHeight = 792;
        } else {
          // 'fit' - matches image dimensions + margin
          pageWidth = naturalWidth + margin * 2;
          pageHeight = naturalHeight + margin * 2;
        }

        // Adjust for orientation
        if (orientation === 'landscape' && pageWidth < pageHeight) {
          [pageWidth, pageHeight] = [pageHeight, pageWidth];
        } else if (orientation === 'portrait' && pageWidth > pageHeight) {
          [pageWidth, pageHeight] = [pageHeight, pageWidth];
        } else if (orientation === 'auto') {
          if (naturalWidth > naturalHeight && pageWidth < pageHeight) {
            [pageWidth, pageHeight] = [pageHeight, pageWidth];
          } else if (naturalWidth < naturalHeight && pageWidth > pageHeight) {
            [pageWidth, pageHeight] = [pageHeight, pageWidth];
          }
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Calculate available area inside margin
        const usableWidth = pageWidth - margin * 2;
        const usableHeight = pageHeight - margin * 2;

        // Scale image to fit inside usable area while preserving aspect ratio
        const scale = Math.min(usableWidth / naturalWidth, usableHeight / naturalHeight);
        const drawWidth = naturalWidth * scale;
        const drawHeight = naturalHeight * scale;

        const x = margin + (usableWidth - drawWidth) / 2;
        const y = margin + (usableHeight - drawHeight) / 2;

        page.drawImage(embeddedImage, {
          x,
          y,
          width: drawWidth,
          height: drawHeight,
        });
      }

      const bytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      downloadBlob(blob, defaultOutputName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PDF from images.');
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFormats}
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files) processFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {images.length === 0 ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
          }}
          style={{
            border: '2px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-1)',
            padding: '56px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color var(--transition-fast)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-lg)',
              background: 'var(--brand-subtle)',
              color: 'var(--brand-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ImagePlus size={28} />
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            {title}
          </p>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0 }}>
            {description}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)' }}>
                {images.length} {images.length === 1 ? 'image' : 'images'} selected
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <Button
                variant="secondary"
                size="sm"
                icon={<ImagePlus size={14} />}
                onClick={() => fileInputRef.current?.click()}
              >
                Add More Images
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setImages([])}>
                Clear All
              </Button>
            </div>
          </div>

          {/* Options Card */}
          <div
            className="c-card"
            style={{
              padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            {/* Page Size */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Page Size:
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { label: 'Fit Image', val: 'fit' },
                  { label: 'A4', val: 'a4' },
                  { label: 'US Letter', val: 'letter' },
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setPageSize(item.val as any)}
                    className="c-btn c-btn--sm"
                    style={{
                      flex: 1,
                      background: pageSize === item.val ? 'var(--brand)' : 'var(--bg-2)',
                      color: pageSize === item.val ? '#fff' : 'var(--ink)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Orientation:
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { label: 'Auto', val: 'auto' },
                  { label: 'Portrait', val: 'portrait' },
                  { label: 'Landscape', val: 'landscape' },
                ].map(item => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setOrientation(item.val as any)}
                    className="c-btn c-btn--sm"
                    style={{
                      flex: 1,
                      background: orientation === item.val ? 'var(--brand)' : 'var(--bg-2)',
                      color: orientation === item.val ? '#fff' : 'var(--ink)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Margin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                Margins:
              </label>
              <div style={{ display: 'flex', gap: 4 }}>
                {[
                  { label: 'None', val: 0 },
                  { label: 'Small', val: 20 },
                  { label: 'Big', val: 40 },
                ].map(item => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setMargin(item.val)}
                    className="c-btn c-btn--sm"
                    style={{
                      flex: 1,
                      background: margin === item.val ? 'var(--brand)' : 'var(--bg-2)',
                      color: margin === item.val ? '#fff' : 'var(--ink)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reorderable Image Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 16,
            }}
          >
            {images.map((item, idx) => (
              <div
                key={item.id}
                className="c-card"
                style={{
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Top toolbar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    background: 'var(--bg-2)',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--ink-2)',
                  }}
                >
                  <span>#{idx + 1}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => rotateImage(item.id)}
                      title="Rotate 90°"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ink-2)' }}
                    >
                      <RotateCw size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveImage(idx, 'left')}
                      title="Move Left"
                      style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', padding: 2, color: idx === 0 ? 'var(--ink-3)' : 'var(--ink-2)' }}
                    >
                      <ArrowLeft size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === images.length - 1}
                      onClick={() => moveImage(idx, 'right')}
                      title="Move Right"
                      style={{ background: 'none', border: 'none', cursor: idx === images.length - 1 ? 'default' : 'pointer', padding: 2, color: idx === images.length - 1 ? 'var(--ink-3)' : 'var(--ink-2)' }}
                    >
                      <ArrowRight size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(item.id)}
                      title="Remove"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--neg)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Preview Thumbnail */}
                <div
                  style={{
                    padding: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 140,
                    background: 'var(--bg)',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    style={{
                      maxWidth: '100%',
                      maxHeight: 120,
                      objectFit: 'contain',
                      transform: `rotate(${item.rotation}deg)`,
                      transition: 'transform 0.2s ease',
                    }}
                  />
                </div>

                {/* Caption */}
                <div style={{ padding: '6px 10px', fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.file.name}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--neg-subtle)',
                color: 'var(--neg)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Action Bar */}
          <div
            className="c-card"
            style={{
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
                {images.length} {images.length === 1 ? 'page' : 'pages'} will be created
              </span>
            </div>

            <Button
              onClick={convertToPdf}
              loading={isConverting}
              disabled={isConverting}
              icon={<Download size={15} />}
            >
              {isConverting ? 'Creating PDF...' : 'Convert to PDF'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
