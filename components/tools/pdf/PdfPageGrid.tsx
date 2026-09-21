'use client';
import React from 'react';
import { RotateCw, Trash2, Check, ZoomIn } from 'lucide-react';
import type { PageThumbnail } from '@/lib/pdfUtils';

interface PdfPageGridProps {
  thumbnails: PageThumbnail[];
  rotations?: Record<number, number>; // pageNumber -> additional rotation degrees (0, 90, 180, 270)
  onRotatePage?: (pageNumber: number) => void;
  selectedPages?: Set<number>; // set of 0-indexed page numbers
  onToggleSelectPage?: (pageIndex: number) => void;
  deletedPages?: Set<number>; // set of 0-indexed page numbers
  onToggleDeletePage?: (pageIndex: number) => void;
  mode?: 'view' | 'select' | 'delete' | 'rotate';
  onZoomPage?: (thumbnail: PageThumbnail) => void;
}

export function PdfPageGrid({
  thumbnails,
  rotations = {},
  onRotatePage,
  selectedPages,
  onToggleSelectPage,
  deletedPages,
  onToggleDeletePage,
  mode = 'view',
  onZoomPage,
}: PdfPageGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 16,
      }}
    >
      {thumbnails.map((thumb, idx) => {
        const pageNum = thumb.pageNumber;
        const pageIdx = pageNum - 1;
        const rotationAngle = (rotations[pageNum] || 0) % 360;
        const isSelected = selectedPages?.has(pageIdx) ?? false;
        const isDeleted = deletedPages?.has(pageIdx) ?? false;

        const handleClick = () => {
          if (mode === 'select' && onToggleSelectPage) {
            onToggleSelectPage(pageIdx);
          } else if (mode === 'delete' && onToggleDeletePage) {
            onToggleDeletePage(pageIdx);
          }
        };

        return (
          <div
            key={pageNum}
            onClick={handleClick}
            className="c-card"
            style={{
              position: 'relative',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              cursor: mode === 'select' || mode === 'delete' ? 'pointer' : 'default',
              border: isDeleted
                ? '2px solid var(--neg)'
                : isSelected
                ? '2px solid var(--brand)'
                : '1px solid var(--border)',
              transition: 'border-color var(--transition-fast), transform var(--transition-fast)',
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--bg-1)',
            }}
          >
            {/* Top Toolbar / Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-2)',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink-2)',
              }}
            >
              <span>Page {pageNum}</span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {mode === 'rotate' && onRotatePage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRotatePage(pageNum);
                    }}
                    title="Rotate 90° Clockwise"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: 'var(--brand)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <RotateCw size={14} />
                  </button>
                )}

                {onZoomPage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onZoomPage(thumb);
                    }}
                    title="Preview page"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: 'var(--ink-3)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <ZoomIn size={14} />
                  </button>
                )}

                {mode === 'delete' && onToggleDeletePage && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleDeletePage(pageIdx);
                    }}
                    title={isDeleted ? 'Restore page' : 'Delete page'}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: isDeleted ? 'var(--neg)' : 'var(--ink-3)',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}

                {mode === 'select' && (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? 'none' : '1px solid var(--border)',
                      background: isSelected ? 'var(--brand)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Canvas Viewport */}
            <div
              style={{
                position: 'relative',
                padding: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 180,
                background: 'var(--bg)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb.dataUrl}
                alt={`Page ${pageNum}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: 160,
                  objectFit: 'contain',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  transform: `rotate(${rotationAngle}deg)`,
                  transition: 'transform 0.25s ease',
                  opacity: isDeleted ? 0.35 : 1,
                }}
              />

              {/* Red Delete Overlay (when marked for deletion) */}
              {isDeleted && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: 'var(--neg)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={18} />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--neg)',
                      background: 'var(--bg-1)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      textTransform: 'uppercase',
                    }}
                  >
                    Deleted
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
