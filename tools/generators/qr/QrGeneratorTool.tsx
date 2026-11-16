'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
// @ts-ignore
import QRCode from 'qrcode';
import { useToast } from '@/components/ui/ToastProvider';
import { downloadBlob, copyToClipboard } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import {
  Download,
  Copy,
  Check,
  Globe,
  AlignLeft,
  Mail,
  Phone,
  Wifi,
  MessageSquare,
  QrCode,
  Palette,
  Sliders,
  Sparkles,
} from 'lucide-react';

type ContentType = 'url' | 'text' | 'email' | 'phone' | 'wifi' | 'sms';
type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

const CONTENT_TYPES: { id: ContentType; label: string; icon: React.ReactNode }[] = [
  { id: 'url', label: 'URL / Link', icon: <Globe size={15} /> },
  { id: 'text', label: 'Text', icon: <AlignLeft size={15} /> },
  { id: 'wifi', label: 'Wi-Fi Network', icon: <Wifi size={15} /> },
  { id: 'email', label: 'Email', icon: <Mail size={15} /> },
  { id: 'phone', label: 'Phone', icon: <Phone size={15} /> },
  { id: 'sms', label: 'SMS', icon: <MessageSquare size={15} /> },
];

export default function QrGeneratorTool() {
  const toast = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Content state
  const [contentType, setContentType] = useState<ContentType>('url');
  const [urlInput, setUrlInput] = useState('https://whysogood.space');
  const [textInput, setTextInput] = useState('');
  
  // Email fields
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Phone & SMS
  const [phoneNumber, setPhoneNumber] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  // WiFi fields
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiEncryption, setWifiEncryption] = useState<'WPA' | 'WEP' | 'nopass'>('WPA');
  const [wifiHidden, setWifiHidden] = useState(false);

  // QR Code styling options
  const [size, setSize] = useState<number>(384);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrection>('M');
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [hasMargin, setHasMargin] = useState(true);

  // Action states
  const [copiedImage, setCopiedImage] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Compute final QR text string based on active content type
  const qrValue = useMemo(() => {
    switch (contentType) {
      case 'url': {
        const trimmed = urlInput.trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
      }
      case 'text':
        return textInput.trim();
      case 'email': {
        if (!emailTo.trim()) return '';
        const params = new URLSearchParams();
        if (emailSubject) params.set('subject', emailSubject);
        if (emailBody) params.set('body', emailBody);
        const qs = params.toString();
        return `mailto:${emailTo.trim()}${qs ? `?${qs}` : ''}`;
      }
      case 'phone':
        return phoneNumber.trim() ? `tel:${phoneNumber.trim()}` : '';
      case 'sms':
        return phoneNumber.trim()
          ? `SMSTO:${phoneNumber.trim()}:${smsMessage}`
          : '';
      case 'wifi': {
        if (!wifiSsid.trim()) return '';
        const enc = wifiEncryption === 'nopass' ? 'nopass' : wifiEncryption;
        const pass = wifiEncryption === 'nopass' ? '' : wifiPassword;
        return `WIFI:T:${enc};S:${wifiSsid};P:${pass};H:${wifiHidden ? 'true' : 'false'};;`;
      }
      default:
        return '';
    }
  }, [
    contentType,
    urlInput,
    textInput,
    emailTo,
    emailSubject,
    emailBody,
    phoneNumber,
    smsMessage,
    wifiSsid,
    wifiPassword,
    wifiEncryption,
    wifiHidden,
  ]);

  // Render to canvas whenever parameters change
  useEffect(() => {
    if (!canvasRef.current) return;
    if (!qrValue) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      return;
    }

    setGenerating(true);
    QRCode.toCanvas(canvasRef.current, qrValue, {
      width: size,
      errorCorrectionLevel: errorCorrection,
      margin: hasMargin ? 4 : 0,
      color: {
        dark: fgColor,
        light: bgColor,
      },
    })
      .catch((err: unknown) => {
        console.error('QR generation error:', err);
      })
      .finally(() => {
        setGenerating(false);
      });
  }, [qrValue, size, errorCorrection, fgColor, bgColor, hasMargin]);

  // Download handlers
  const handleDownloadPng = () => {
    if (!canvasRef.current || !qrValue) return;
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, 'qrcode.png');
        toast.success('Downloaded QR code PNG');
      }
    }, 'image/png');
  };

  const handleDownloadSvg = async () => {
    if (!qrValue) return;
    try {
      const svgString = await QRCode.toString(qrValue, {
        type: 'svg',
        width: size,
        errorCorrectionLevel: errorCorrection,
        margin: hasMargin ? 4 : 0,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      });
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      downloadBlob(blob, 'qrcode.svg');
      toast.success('Downloaded QR code vector SVG');
    } catch {
      toast.error('Failed to generate SVG');
    }
  };

  const handleCopyImage = () => {
    if (!canvasRef.current || !qrValue) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      try {
        if (navigator.clipboard && window.ClipboardItem) {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          setCopiedImage(true);
          toast.success('QR Code image copied to clipboard');
          setTimeout(() => setCopiedImage(false), 2000);
        } else {
          toast.error('Direct image copy not supported in this browser');
        }
      } catch {
        toast.error('Failed to copy image to clipboard');
      }
    }, 'image/png');
  };

  const handleCopySvg = async () => {
    if (!qrValue) return;
    try {
      const svgString = await QRCode.toString(qrValue, {
        type: 'svg',
        width: size,
        errorCorrectionLevel: errorCorrection,
        margin: hasMargin ? 4 : 0,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      });
      await copyToClipboard(svgString);
      setCopiedSvg(true);
      toast.success('Vector SVG markup copied to clipboard');
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch {
      toast.error('Failed to copy SVG');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Type Selector Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          borderBottom: '1px solid var(--border)',
        }}
      >
        {CONTENT_TYPES.map((t) => {
          const active = contentType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setContentType(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                background: active ? 'var(--brand)' : 'transparent',
                color: active ? '#ffffff' : 'var(--ink-2)',
                border: 'none',
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Grid: Controls vs Preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Form & Styling */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Content Inputs Card */}
          <div className="c-card" style={{ padding: 20 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <QrCode size={16} color="var(--brand-500)" />
              <span>QR Content</span>
            </h3>

            {/* URL Type */}
            {contentType === 'url' && (
              <div className="c-field">
                <label className="c-field__label">Website URL</label>
                <input
                  type="url"
                  className="c-field__input"
                  placeholder="https://example.com"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                />
              </div>
            )}

            {/* Plain Text Type */}
            {contentType === 'text' && (
              <div className="c-field">
                <label className="c-field__label">Text Content</label>
                <textarea
                  className="c-textarea"
                  rows={4}
                  placeholder="Enter any text or notes..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                />
              </div>
            )}

            {/* Wi-Fi Type */}
            {contentType === 'wifi' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="c-field">
                  <label className="c-field__label">Network Name (SSID)</label>
                  <input
                    type="text"
                    className="c-field__input"
                    placeholder="e.g. Home_Network"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                  />
                </div>
                <div className="c-field">
                  <label className="c-field__label">Security / Encryption</label>
                  <select
                    className="c-select"
                    value={wifiEncryption}
                    onChange={(e) =>
                      setWifiEncryption(e.target.value as 'WPA' | 'WEP' | 'nopass')
                    }
                  >
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">None (Open Network)</option>
                  </select>
                </div>
                {wifiEncryption !== 'nopass' && (
                  <div className="c-field">
                    <label className="c-field__label">Password</label>
                    <input
                      type="text"
                      className="c-field__input"
                      placeholder="Network Password"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                    />
                  </div>
                )}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    color: 'var(--ink-2)',
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={wifiHidden}
                    onChange={(e) => setWifiHidden(e.target.checked)}
                  />
                  <span>Hidden Network SSID</span>
                </label>
              </div>
            )}

            {/* Email Type */}
            {contentType === 'email' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="c-field">
                  <label className="c-field__label">Recipient Email</label>
                  <input
                    type="email"
                    className="c-field__input"
                    placeholder="contact@company.com"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                  />
                </div>
                <div className="c-field">
                  <label className="c-field__label">Subject (Optional)</label>
                  <input
                    type="text"
                    className="c-field__input"
                    placeholder="Meeting Request"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                  />
                </div>
                <div className="c-field">
                  <label className="c-field__label">Message Body</label>
                  <textarea
                    className="c-textarea"
                    rows={3}
                    placeholder="Hello, I'd like to connect..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Phone Type */}
            {contentType === 'phone' && (
              <div className="c-field">
                <label className="c-field__label">Phone Number</label>
                <input
                  type="tel"
                  className="c-field__input"
                  placeholder="+1 (555) 000-0000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            )}

            {/* SMS Type */}
            {contentType === 'sms' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="c-field">
                  <label className="c-field__label">Recipient Phone Number</label>
                  <input
                    type="tel"
                    className="c-field__input"
                    placeholder="+1 (555) 000-0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <div className="c-field">
                  <label className="c-field__label">Pre-filled SMS Message</label>
                  <textarea
                    className="c-textarea"
                    rows={3}
                    placeholder="Hi, please send me details about..."
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Styling Options Card */}
          <div className="c-card" style={{ padding: 20 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--ink)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Palette size={16} color="var(--brand-500)" />
              <span>Design & Quality Options</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Size Slider */}
              <div className="c-field">
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 4,
                  }}
                >
                  <label className="c-field__label" style={{ margin: 0 }}>
                    Export Size
                  </label>
                  <span
                    style={{
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--brand)',
                      fontWeight: 600,
                    }}
                  >
                    {size} × {size} px
                  </span>
                </div>
                <input
                  type="range"
                  min="128"
                  max="1024"
                  step="32"
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--brand)' }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {[256, 384, 512, 1024].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSize(s)}
                      className={`c-btn c-btn--ghost c-btn--sm`}
                      style={{
                        padding: '2px 8px',
                        fontSize: 11,
                        background: size === s ? 'var(--brand-subtle, rgba(21, 128, 209, 0.12))' : undefined,
                        color: size === s ? 'var(--brand)' : 'var(--ink-2)',
                      }}
                    >
                      {s}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Correction */}
              <div className="c-field">
                <label className="c-field__label">Error Correction Level</label>
                <select
                  className="c-select"
                  value={errorCorrection}
                  onChange={(e) => setErrorCorrection(e.target.value as ErrorCorrection)}
                >
                  <option value="L">Level L (Low ~7% recovery)</option>
                  <option value="M">Level M (Medium ~15% recovery) - Standard</option>
                  <option value="Q">Level Q (Quartile ~25% recovery)</option>
                  <option value="H">Level H (High ~30% recovery) - Best for Print</option>
                </select>
              </div>

              {/* Color pickers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                }}
              >
                <div className="c-field">
                  <label className="c-field__label">Pattern Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      style={{
                        width: 38,
                        height: 38,
                        padding: 0,
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: 'transparent',
                      }}
                    />
                    <input
                      type="text"
                      className="c-field__input"
                      value={fgColor}
                      onChange={(e) => setFgColor(e.target.value)}
                      style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                <div className="c-field">
                  <label className="c-field__label">Background Color</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      style={{
                        width: 38,
                        height: 38,
                        padding: 0,
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        background: 'transparent',
                      }}
                    />
                    <input
                      type="text"
                      className="c-field__input"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                    />
                  </div>
                </div>
              </div>

              {/* Margin Quiet Zone Toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={hasMargin}
                  onChange={(e) => setHasMargin(e.target.checked)}
                />
                <span>Include Quiet Zone Margin (recommended for reliable scanning)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Live QR Preview & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            className="c-card"
            style={{
              padding: 24,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                Live Preview
              </span>
              <span className="c-badge c-badge--neutral">
                {size} × {size} px
              </span>
            </div>

            {/* Canvas Viewer Container */}
            <div
              style={{
                width: '100%',
                maxWidth: 320,
                aspectRatio: '1 / 1',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                background: 'var(--bg-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 12px rgba(0,0,0,0.03)',
              }}
            >
              {qrValue ? (
                <canvas
                  ref={canvasRef}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 'var(--radius-sm)',
                  }}
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 12,
                    color: 'var(--ink-3)',
                    padding: 24,
                  }}
                >
                  <QrCode size={48} strokeWidth={1.5} />
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>
                    Enter content to generate your live QR code
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions Under Preview */}
            {qrValue && (
              <div
                style={{
                  width: '100%',
                  marginTop: 24,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                {/* Primary Action Button (max 1 primary per view per guidelines) */}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleDownloadPng}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Download size={18} style={{ marginRight: 8 }} />
                  Download PNG ({size}px)
                </Button>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 8,
                  }}
                >
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleDownloadSvg}
                    style={{ justifyContent: 'center' }}
                  >
                    <Download size={15} style={{ marginRight: 6 }} />
                    Vector SVG
                  </Button>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleCopyImage}
                    style={{ justifyContent: 'center' }}
                  >
                    {copiedImage ? (
                      <Check size={15} style={{ marginRight: 6 }} />
                    ) : (
                      <Copy size={15} style={{ marginRight: 6 }} />
                    )}
                    Copy Image
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopySvg}
                  style={{ justifyContent: 'center', color: 'var(--ink-2)' }}
                >
                  {copiedSvg ? (
                    <Check size={14} style={{ marginRight: 6 }} />
                  ) : (
                    <Copy size={14} style={{ marginRight: 6 }} />
                  )}
                  Copy Raw SVG Markup
                </Button>
              </div>
            )}
          </div>

          {/* Quick scanning tips */}
          <div
            style={{
              padding: 16,
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              fontSize: 13,
              color: 'var(--ink-2)',
              lineHeight: 1.6,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                color: 'var(--ink)',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={14} color="var(--brand)" />
              <span>Scanning Best Practices</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Ensure high contrast between the pattern and background.</li>
              <li>Keep the quiet zone margin enabled for faster smartphone camera locks.</li>
              <li>Use <strong>High (Level H)</strong> error correction if printing on physical packaging.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
