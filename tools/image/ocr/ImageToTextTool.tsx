'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  ScanText,
  UploadCloud,
  Copy,
  Check,
  Download,
  RefreshCw,
  FileText,
  AlignLeft,
  Filter,
  Eye,
  Trash2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { formatFileSize, downloadBlob, copyToClipboard } from '@/lib/utils';
import { useToast } from '@/components/ui/ToastProvider';
import { Select } from '@/components/ui/Select';

interface ExtractedLine {
  id: number;
  text: string;
  confidence: number;
}

export default function ImageToTextTool() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [lines, setLines] = useState<ExtractedLine[]>([]);
  const [rawText, setRawText] = useState<string>('');
  const [removeBlankLines, setRemoveBlankLines] = useState(true);
  const [trimWhitespace, setTrimWhitespace] = useState(true);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'eng' | 'spa' | 'fra' | 'deu'>('eng');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (selectedFile: File) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (JPG, PNG, WebP, etc.)');
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    const url = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setPreviewUrl(url);
    setLines([]);
    setRawText('');
    setErrorMessage(null);
    setProgress(0);

    // Auto-run OCR
    extractTextFromImage(selectedFile, url, selectedLanguage);
  };

  const extractTextFromImage = async (imgFile: File, url: string, lang: string) => {
    setIsProcessing(true);
    setProgress(5);
    setProgressStatus('Initializing OCR engine…');
    setErrorMessage(null);

    try {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker(lang, 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            const pct = Math.round(m.progress * 100);
            setProgress(pct);
            setProgressStatus(`Extracting text line after line (${pct}%)…`);
          } else if (m.status === 'loading tesseract core') {
            setProgressStatus('Loading WebAssembly OCR engine…');
          } else if (m.status === 'loading language traineddata') {
            setProgressStatus(`Loading ${lang.toUpperCase()} language models…`);
          }
        },
      });

      const result = await worker.recognize(url);
      await worker.terminate();

      const fullText = result.data.text || '';
      setRawText(fullText);

      // Extract lines preserving exact formatting
      let extractedLines: ExtractedLine[] = [];
      if (result.data.blocks && result.data.blocks.length > 0) {
        let lineIdx = 1;
        for (const block of result.data.blocks) {
          for (const para of block.paragraphs) {
            for (const line of para.lines) {
              const cleaned = line.text.replace(/\r?\n$/, '');
              extractedLines.push({
                id: lineIdx++,
                text: cleaned,
                confidence: Math.round(line.confidence),
              });
            }
          }
        }
      }

      if (extractedLines.length === 0) {
        // Fallback split by newline
        extractedLines = fullText.split(/\r?\n/).map((line, idx) => ({
          id: idx + 1,
          text: line,
          confidence: Math.round(result.data.confidence) || 85,
        }));
      }

      setLines(extractedLines);
      toast.success(`Recognized ${extractedLines.length} lines of text!`);
    } catch (err: unknown) {
      console.error('OCR Extraction error:', err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to extract text from this image. Please ensure the image contains clear, readable text.'
      );
      toast.error('Failed to recognize text from image');
    } finally {
      setIsProcessing(false);
      setProgress(100);
      setProgressStatus('Extraction completed');
    }
  };

  const getFilteredLines = () => {
    let result = lines;
    if (trimWhitespace) {
      result = result.map(l => ({ ...l, text: l.text.trim() }));
    }
    if (removeBlankLines) {
      result = result.filter(l => l.text.length > 0);
    }
    return result;
  };

  const displayLines = getFilteredLines();
  const formattedOutputText = displayLines.map(l => l.text).join('\n');

  const handleCopyAll = async () => {
    if (!formattedOutputText) return;
    await copyToClipboard(formattedOutputText);
    setCopied(true);
    toast.success('Extracted text copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLine = async (text: string) => {
    await copyToClipboard(text);
    toast.success('Line copied!');
  };

  const handleDownloadTxt = () => {
    if (!formattedOutputText || !file) return;
    const blob = new Blob([formattedOutputText], { type: 'text/plain;charset=utf-8' });
    const baseName = file.name.replace(/\.[^.]+$/, '');
    downloadBlob(blob, `${baseName}_extracted_text.txt`);
    toast.success('Downloaded as TXT');
  };

  const handleDownloadJson = () => {
    if (!displayLines.length || !file) return;
    const jsonContent = JSON.stringify(
      {
        sourceImage: file.name,
        extractedAt: new Date().toISOString(),
        totalLines: displayLines.length,
        lines: displayLines,
      },
      null,
      2
    );
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const baseName = file.name.replace(/\.[^.]+$/, '');
    downloadBlob(blob, `${baseName}_ocr.json`);
    toast.success('Downloaded as JSON');
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setLines([]);
    setRawText('');
    setErrorMessage(null);
    setProgress(0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Dropzone / Upload Area ────────────────────────────────────────── */}
      {!file ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handleFileChange(e.dataTransfer.files[0]);
          }}
          className="c-card c-card--hover"
          style={{
            padding: '56px 24px',
            borderRadius: 'var(--radius-xl)',
            background: 'var(--bg-1)',
            border: '2px dashed var(--border)',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all var(--transition-base)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          />
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-subtle)',
              color: 'var(--brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <ScanText size={28} />
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: 'var(--ink)' }}>
            Drop any image to extract text line-by-line
          </h3>
          <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 16px' }}>
            Supports screenshots, scanned documents, receipts, photos, and book pages.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span className="c-badge" style={{ fontSize: 11 }}>100% In-Browser OCR</span>
            <span className="c-badge" style={{ fontSize: 11 }}>Exact Line Formatting</span>
            <span className="c-badge" style={{ fontSize: 11 }}>Zero Server Uploads</span>
          </div>
        </div>
      ) : (
        /* ── Loaded Image & OCR Workspace ──────────────────────────────────── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active File Bar */}
          <div
            className="c-card"
            style={{
              padding: '16px 20px',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-2)',
                  border: '1px solid var(--border)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt={file.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <ScanText size={22} style={{ color: 'var(--brand)' }} />
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 360 }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                  {formatFileSize(file.size)} • {displayLines.length} recognized lines
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Select
                selectSize="sm"
                fullWidth={false}
                value={selectedLanguage}
                onChange={e => {
                  const newLang = e.target.value as 'eng' | 'spa' | 'fra' | 'deu';
                  setSelectedLanguage(newLang);
                  if (file && previewUrl) extractTextFromImage(file, previewUrl, newLang);
                }}
                options={[
                  { value: 'eng', label: 'Language: English' },
                  { value: 'spa', label: 'Language: Spanish' },
                  { value: 'fra', label: 'Language: French' },
                  { value: 'deu', label: 'Language: German' },
                ]}
                style={{ minWidth: 170 }}
              />

              <button
                onClick={() => previewUrl && extractTextFromImage(file, previewUrl, selectedLanguage)}
                disabled={isProcessing}
                className="c-btn c-btn--secondary c-btn--sm"
                style={{ height: 36, display: 'flex', alignItems: 'center', gap: 6 }}
                title="Rerun OCR extraction"
              >
                <RefreshCw size={14} className={isProcessing ? 'animate-spin' : ''} />
                <span>Re-scan</span>
              </button>

              <button
                onClick={handleClear}
                className="c-btn c-btn--ghost c-btn--sm"
                style={{ height: 36, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)' }}
              >
                <Trash2 size={14} />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Processing Progress Bar */}
          {isProcessing && (
            <div
              className="c-card"
              style={{
                padding: '20px 24px',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ink)', fontWeight: 600 }}>
                <span>{progressStatus || 'Processing image…'}</span>
                <span>{progress}%</span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-2)',
                  overflow: 'hidden',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    background: 'var(--brand)',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 250ms ease-out',
                  }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--neg)',
                color: 'var(--neg)',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Two-Column Workspace: Image Preview & Line-by-Line Text */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 20,
            }}
          >
            {/* Column 1: Source Image Preview */}
            <div
              className="c-card"
              style={{
                padding: 16,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Original Image</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>Inspect source text</span>
              </div>

              <div
                style={{
                  background: 'var(--bg-2)',
                  borderRadius: 'var(--radius-md)',
                  padding: 12,
                  minHeight: 360,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {previewUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Source preview"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 500,
                      objectFit: 'contain',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Column 2: Extracted Line-by-Line Text */}
            <div
              className="c-card"
              style={{
                padding: 16,
                borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-1)',
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlignLeft size={16} style={{ color: 'var(--brand)' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                    Extracted Text ({displayLines.length} Lines)
                  </span>
                </div>

                {/* Quick Action Buttons */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleCopyAll}
                    disabled={!displayLines.length}
                    className="c-btn c-btn--primary c-btn--sm"
                    style={{ height: 32, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied!' : 'Copy All'}</span>
                  </button>

                  <button
                    onClick={handleDownloadTxt}
                    disabled={!displayLines.length}
                    className="c-btn c-btn--secondary c-btn--sm"
                    style={{ height: 32, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Download size={14} />
                    <span>.TXT</span>
                  </button>

                  <button
                    onClick={handleDownloadJson}
                    disabled={!displayLines.length}
                    className="c-btn c-btn--secondary c-btn--sm"
                    style={{ height: 32, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <FileText size={14} />
                    <span>.JSON</span>
                  </button>
                </div>
              </div>

              {/* Formatting Toggles */}
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-2)',
                  fontSize: 12,
                  color: 'var(--ink-2)',
                  flexWrap: 'wrap',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={removeBlankLines}
                    onChange={e => setRemoveBlankLines(e.target.checked)}
                    style={{ accentColor: 'var(--brand)', cursor: 'pointer' }}
                  />
                  <span>Remove blank lines</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={trimWhitespace}
                    onChange={e => setTrimWhitespace(e.target.checked)}
                    style={{ accentColor: 'var(--brand)', cursor: 'pointer' }}
                  />
                  <span>Trim whitespace</span>
                </label>
              </div>

              {/* Line-by-Line Content Container */}
              <div
                style={{
                  background: 'var(--bg-2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  minHeight: 360,
                  maxHeight: 480,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
              >
                {displayLines.length > 0 ? (
                  displayLines.map(line => (
                    <div
                      key={line.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '6px 8px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-1)',
                        border: '1px solid var(--border)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--ink-3)',
                          userSelect: 'none',
                          minWidth: 26,
                          textAlign: 'right',
                          paddingTop: 1,
                        }}
                      >
                        {String(line.id).padStart(2, '0')}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          fontSize: 13,
                          color: 'var(--ink)',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.5,
                        }}
                      >
                        {line.text}
                      </span>
                      <button
                        onClick={() => handleCopyLine(line.text)}
                        title="Copy this line"
                        className="c-btn c-btn--ghost c-btn--sm"
                        style={{
                          padding: '2px 6px',
                          height: 24,
                          fontSize: 11,
                          color: 'var(--ink-3)',
                          flexShrink: 0,
                        }}
                      >
                        <Copy size={11} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      height: '100%',
                      minHeight: 280,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--ink-3)',
                      fontSize: 13,
                      textAlign: 'center',
                      gap: 8,
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--brand)' }} />
                        <span>Analyzing image text layout…</span>
                      </>
                    ) : (
                      <>
                        <ScanText size={24} />
                        <span>No text recognized yet. Click &quot;Re-scan&quot; or try another image.</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Privacy Assurance ────────────────────────────────────────────── */}
      <div
        style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          flexWrap: 'wrap',
          fontSize: 13,
          color: 'var(--ink-2)',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--pos)', fontWeight: 600 }}>
          <ShieldCheck size={16} /> 100% Client-Side Optical Recognition
        </span>
        <span>•</span>
        <span>Image never leaves your browser</span>
        <span>•</span>
        <span>Formatted line after line</span>
        <span>•</span>
        <span>Free & Unlimited</span>
      </div>
    </div>
  );
}
